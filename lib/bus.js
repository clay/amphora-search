'use strict';

const bluebird = require('bluebird'),
  crypto = require('crypto'),
  redis = require('redis'),
  streams = require('./streams'),
  { BUS_NAMESPACE, BUS_TOPICS } = require('./constants'),
  // Namespace + TTL for the short-lived "first replica wins" claim keys. The TTL
  // only needs to outlive the pub/sub fan-out (every replica receives a copy of
  // the same broadcast within milliseconds), not the downstream indexing work —
  // Elastic writes are idempotent, so a rare double-claim is harmless.
  DEDUPE_PREFIX = 'amphora-search:dedupe',
  DEDUPE_TTL = Number(process.env.AMPHORA_SEARCH_BUS_DEDUPE_TTL) || 60;
var client,
  dedupeClient,
  log = require('./services/log').setup({file: __filename});

bluebird.promisifyAll(redis);

/**
 * Connect to Redis
 */
function connect() {
  client = redis.createClient(process.env.CLAY_BUS_HOST);
  // `client` is put into subscribe mode in `subscribe()` and Redis forbids
  // running regular commands on a subscribed connection, so the SET-based claim
  // lock needs its own dedicated connection.
  dedupeClient = redis.createClient(process.env.CLAY_BUS_HOST);
}

/**
 * Build a stable dedupe id for a published payload. Every replica receives the
 * exact same payload bytes for a given broadcast, so hashing the raw payload
 * yields an identical key across replicas (collapsing the fan-out) while a later
 * genuine re-publish — which carries different bytes — produces a different key.
 *
 * @param {String} payload - the raw published payload
 * @returns {String} hex digest used as the claim key
 */
function hashPayload(payload) {
  return crypto.createHash('sha1').update(payload).digest('hex');
}

/**
 * Ensure exactly one *live* replica processes a scoped bus event.
 *
 * Previously amphora-search only processed an event when the current process
 * was the one that originally published it (pid + hostname match). Under
 * Kubernetes the publishing pod is frequently already gone by the time its own
 * broadcast arrives (rolling deploys, autoscaling, OOM kills), so every
 * surviving replica failed that check and the event — e.g. the Elastic index
 * write for a scheduled publish — was silently dropped forever.
 *
 * Instead, any live replica may claim the event via a short-lived Redis
 * `SET NX` lock keyed on the immutable payload. The first to claim it processes
 * it; the rest skip. If Redis is unavailable we FAIL OPEN and process anyway:
 * Elastic writes are idempotent (keyed by doc id) so a duplicate is harmless,
 * whereas a silent drop is unrecoverable data loss.
 *
 * @param {String} topic - full namespaced topic, e.g. `clay:save`
 * @param {String} payload - the raw published payload (identical per replica)
 * @param {Function} cb - invoked with `true` when this replica should process
 */
function claimEvent(topic, payload, cb) {
  if (!dedupeClient) {
    // No claim connection (e.g. unit tests, or bus host unset): fail open so we
    // never drop an event just because dedup is unavailable.
    cb(true);

    return;
  }

  const key = `${DEDUPE_PREFIX}:${topic}:${hashPayload(payload)}`;

  dedupeClient.set(key, '1', 'NX', 'EX', DEDUPE_TTL, (err, res) => {
    if (err) {
      log('error', `[SEARCH][BUS][DEDUPE_ERROR] topic=${topic} action=fail-open error=${err.message}`);
      cb(true);

      return;
    }

    // `OK` => we won the claim; `null` => another replica already owns it.
    cb(res === 'OK');
  });
}

/**
 * Send the event to the appropriate stream.
 *
 * Events stamped with a publisher hostname + pid come from
 * amphora-event-bus-redis and are broadcast to every replica, so they are
 * deduped via a claim lock (see `claimEvent`). Unstamped events are written
 * directly.
 *
 * @param {String} topic
 * @param {String} payload
 */
function disperseEvent(topic, payload) {
  let data;

  try {
    data = JSON.parse(payload);
  } catch (e) {
    log('error', `Unable to send event ${topic} to bus: ${e.message}`, { payload });

    return;
  }

  // amphora-event-bus-redis wraps every published event as `{ hostname, pid, msg }`,
  // where hostname/pid identify the *publishing* process and the real event payload
  // lives under `.msg`. The presence of that stamp is our signal that this message
  // arrived via the Redis pub/sub fan-out — meaning an identical copy was just
  // delivered to every live replica of the search service at the same time.
  const scopedWrite = data.pid && data.hostname;

  if (!scopedWrite) {
    // Unstamped => it did not come through the broadcast, so only a single copy
    // exists and there is nothing to dedupe. There is also no `.msg` envelope here,
    // so `data` itself is the event — write it straight through.
    streams[topic].write(data);

    return;
  }

  // Stamped => every replica is executing this same line on an identical copy right
  // now. Funnel them through a Redis claim lock so that exactly one *live* replica
  // performs the indexing:
  //   - the first replica to claim the key wins (won === true) and forwards the
  //     unwrapped event (`data.msg`, dropping the hostname/pid envelope);
  //   - the rest lose (won === false) and silently skip it.
  // This replaces the previous "only process if data.pid/hostname === this process"
  // gate. Under Kubernetes the publishing pod is routinely gone (rolling deploy,
  // autoscale, OOM) by the time its own broadcast arrives, so that gate matched no
  // live replica and the event — e.g. a scheduled publish's Elastic index write —
  // was dropped forever with no error. Any live replica claiming it fixes that.
  claimEvent(topic, payload, won => {
    if (won) {
      streams[topic].write(data.msg);
    }
  });
}

/**
 *
 */
function subscribe() {
  // Subscribe to all events saves
  for (let i = 0; i < BUS_TOPICS.length; i++) {
    client.subscribe(`${BUS_NAMESPACE}:${BUS_TOPICS[i]}`);
  }

  // Send the event to a stream consumer
  client.on('message', disperseEvent);
}

/**
 * Try to connect to the bus host and then subscribe
 * to all the events coming out of the bus
 *
 * @returns {Promise}
 */
function init() {
  if (!process.env.CLAY_BUS_HOST) {
    throw new Error('CLAY_BUS_HOST env var is not set! Amphora Search cannot initialize');
  }

  if (client) { // Return if we've already connected
    return bluebird.resolve('Already connected');
  }

  return bluebird.try(connect)
    .then(subscribe);
}

module.exports = init;
// For testing
module.exports.disperseEvent = disperseEvent;
module.exports.claimEvent = claimEvent;
module.exports.setClient = mock => client = mock;
module.exports.setDedupeClient = mock => dedupeClient = mock;
module.exports.setLog = mock => log = mock;
