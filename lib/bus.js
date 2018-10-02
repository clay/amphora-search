'use strict';

const bluebird = require('bluebird'),
  redis = require('redis'),
  streams = require('./streams'),
  { BUS_NAMESPACE, BUS_TOPICS } = require('./constants'),
  PID = process.pid,
  HOSTNAME = require('os').hostname();
var client,
  log = require('./services/log').setup({file: __filename});

bluebird.promisifyAll(redis);

/**
 * Connect to Redis
 */
function connect() {
  client = redis.createClient(process.env.CLAY_BUS_HOST);
}

/**
 * Send the event to the appropriate stream
 *
 * @param {String} topic
 * @param {String} payload
 */
function disperseEvent(topic, payload) {
  try {
    let data = JSON.parse(payload),
      scopedWrite = data.pid && data.hostname;

    if (scopedWrite) { // We're dealing with amphora-redis-event-bus calls
      if (data.pid === PID && HOSTNAME === data.hostname) {
        streams[topic].write(data.msg);
      }
    } else {
      streams[topic].write(data);
    }
  } catch (e) {
    log('error', `Unable to send event ${topic} to bus: ${e.message}`, { payload });
  }
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
module.exports.setClient = mock => client = mock;
module.exports.setLog = mock => log = mock;
