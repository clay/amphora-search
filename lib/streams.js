'use strict';

// Event delivery for amphora bus topics.
//
// Two APIs live here during the Highland migration:
//
//   - `on(topic, handler)`  -- the native one. Plain functions, called directly by `dispatch`.
//   - `subscribe(topic)`    -- the legacy one. Returns a Highland stream fork. Deprecated, but
//                              still the only thing the ~15 handlers in nymag/sites use, so it
//                              stays until they are ported.
//
// `dispatch` feeds both, so a consumer can be moved from one to the other one at a time with no
// flag and no coordinated release.

const _ = require('lodash'),
  h = require('highland'),
  { BUS_NAMESPACE, BUS_TOPICS } = require('./constants'),
  STREAMS = {}, // legacy Highland stream per topic
  HANDLERS = {}, // topic -> [handler], the native replacement for STREAMS
  // Topics something has actually forked via `subscribe`. Writing to an unforked Highland
  // stream buffers the value forever, so `dispatch` must not do it -- see the note on
  // `dispatch` below.
  LEGACY_FORKED = new Set();
var log = require('./services/log').setup({ file: __filename });

/**
 * Drop the bus namespace from a topic, if it's there.
 *
 * Every API here accepts either form. Callers legitimately have both: amphora publishes and
 * Redis delivers `clay:save`, while the handler manifest and BUS_TOPICS use `save`. Accepting
 * both means a caller never has to know which one it's holding, and nymag/sites can drop its own
 * copy of this logic (search/bus/streams.js#stripNamespace).
 *
 * @param {String} topic - e.g. `clay:save` or `save`
 * @returns {String} e.g. `save`
 */
function stripNamespace(topic) {
  const prefix = `${BUS_NAMESPACE}:`;

  return typeof topic === 'string' && topic.startsWith(prefix)
    ? topic.slice(prefix.length)
    : topic;
}

/**
 * @param {String} topic - namespaced or not
 * @returns {String} the bare topic
 * @throws {Error} if the topic is not one amphora publishes
 */
function assertKnownTopic(topic) {
  const bare = stripNamespace(topic);

  if (BUS_TOPICS.indexOf(bare) === -1) {
    throw new Error('Stream `subscribe` called with an invalid event!');
  }

  return bare;
}

/**
 * Register a plain function to receive a topic's payloads.
 *
 * The native replacement for `subscribe`. The handler is called once per event with its own
 * deep clone of the payload, so it can mutate freely without affecting other consumers -- the
 * same isolation `subscribe`'s per-fork `cloneDeep` gives, without the stream.
 *
 * A handler may return a Promise; `dispatch` will attach a rejection handler to it but will not
 * wait for it. Delivery is fire-and-forget in both APIs: a handler cannot fail the publish that
 * produced the event, and cannot affect any other handler.
 *
 * @param {String} topic - one of BUS_TOPICS, namespaced or not
 * @param {Function} handler - `(payload) => void|Promise`
 * @throws {Error} on an unknown topic or a non-function handler
 */
function on(topic, handler) {
  const bare = assertKnownTopic(topic);

  if (typeof handler !== 'function') {
    throw new Error('Stream `on` requires a handler function');
  }

  if (!HANDLERS[bare]) {
    HANDLERS[bare] = [];
  }

  HANDLERS[bare].push(handler);
}

/**
 * Get a fork of a specific Stream that corresponds
 * to an event from Amphora
 *
 * @deprecated use `on(topic, handler)`. Kept because nymag/sites' handlers still consume
 *  Highland streams; remove once they are ported.
 * @param  {String} e
 * @return {Stream}
 */
function subscribe(e) {
  const bare = assertKnownTopic(e);

  LEGACY_FORKED.add(bare);

  if (bare === 'save' || bare === 'delete') {
    return STREAMS[bare].fork().map(ops => h(_.cloneDeep(ops)));
  }

  return STREAMS[bare].fork().map(_.cloneDeep);
}

/**
 * Log a handler failure without letting it escape. Native handlers are isolated from each
 * other and from the caller, matching what `.errors(...)` did for the Highland consumers.
 *
 * @param {String} topic
 * @param {Error} err
 */
function logHandlerError(topic, err) {
  log('error', `Error in ${topic} handler: ${err.message}`, { stack: err.stack });
}

/**
 * Deliver one event to every consumer of a topic.
 *
 * Native handlers run first, each with its own clone, each isolated: a throw or a rejection is
 * logged and cannot reach the caller or the other handlers. Then the legacy Highland stream is
 * written, if anything forked it.
 *
 * That `LEGACY_FORKED` check is a behaviour change worth knowing about: this used to be an
 * unconditional `streams[topic].write(...)` from lib/bus.js, and a Highland stream with no fork
 * buffers everything written to it for the life of the process. The bus subscribes to every
 * topic in BUS_TOPICS regardless of whether anything consumes it, so the unconsumed ones were
 * accumulating in memory forever.
 *
 * Which topics those are, measured against nymag/sites rather than assumed (an earlier version
 * of this comment wrongly listed `publishPage`):
 *   consumed   save, unpublishPage      -- search/handlers/*.js
 *   consumed   publishPage              -- amphora/plugins/{syndication,coral-hook}.js, both
 *                                         calling this module's `subscribe` directly
 *   consumed   saveMeta, saveUser, deleteUser -- lib/lists/index.js, now via `on` rather than
 *                                         `subscribe`, so their legacy streams are deliberately
 *                                         unforked from here on
 *   unconsumed createPage, delete, publishLayout -- these are the leak
 *
 * Dropping an event nobody consumes is safe because registration always precedes delivery:
 * handlers subscribe while `setup()` requires them (lib/setup.js:73-75), the internal list
 * subscribers register at require time (lib/lists/index.js), and only then does `onInit` connect
 * the bus -- `setup(options).then(bus)` at lib/init.js:39-40.
 *
 * @param {String} topic - namespaced (`clay:save`) or not (`save`)
 * @param {Object|Array} payload - the event payload
 */
function dispatch(topic, payload) {
  const bare = assertKnownTopic(topic),
    handlers = HANDLERS[bare] || [];

  // TEMPORARY POC instrumentation, matching nymag/sites' [SEARCH][TRACE] tag so one publish can
  // be followed across both repos. Off unless SEARCH_TRACE=true. Counts and topics only.
  if (process.env.SEARCH_TRACE === 'true') {
    log('info', `[SEARCH][TRACE][AS_DISPATCH] topic=${bare} nativeHandlers=${handlers.length} ` +
      `legacyForked=${LEGACY_FORKED.has(bare)}`);
  }

  for (const handler of handlers) {
    try {
      const result = handler(_.cloneDeep(payload));

      if (result && typeof result.then === 'function') {
        result.catch(err => logHandlerError(bare, err));
      }
    } catch (err) {
      logHandlerError(bare, err);
    }
  }

  if (LEGACY_FORKED.has(bare)) {
    STREAMS[bare].write(payload);
  }
}

/**
 * Whether anything is listening to a topic, on either API. Diagnostic only.
 *
 * @param {String} topic
 * @returns {Boolean}
 */
function hasSubscribers(topic) {
  const bare = stripNamespace(topic);

  return Boolean(HANDLERS[bare] && HANDLERS[bare].length) || LEGACY_FORKED.has(bare);
}

/**
 * Assign streams and export all streams
 */
for (let i = 0; i < BUS_TOPICS.length; i++) {
  let topic = BUS_TOPICS[i];

  STREAMS[topic] = h(); // Make a new stream
  module.exports[`${BUS_NAMESPACE}:${topic}`] = STREAMS[topic]; // Export stream under full topic
}

module.exports.subscribe = subscribe;
module.exports.on = on;
module.exports.stripNamespace = stripNamespace;
module.exports.dispatch = dispatch;
module.exports.hasSubscribers = hasSubscribers;

// For testing
module.exports.setLog = mock => log = mock;
module.exports.reset = () => {
  Object.keys(HANDLERS).forEach(topic => delete HANDLERS[topic]);
  LEGACY_FORKED.clear();
};
