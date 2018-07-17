'use strict';

const bluebird = require('bluebird'),
  redis = bluebird.promisifyAll(require('redis')),
  streams = require('./streams'),
  { BUS_NAMESPACE, BUS_TOPICS } = require('./constants');
var client;

function connect() {
  client = redis.createClient(process.env.CLAY_BUS_HOST);
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
  client.on('message', (topic, payload) => {
    let data = JSON.parse(payload);

    if (Array.isArray(data)) {
      data.forEach(item => {
        streams[topic].write(item);
      });
    } else {
      streams[topic].write(data);
    }
  });
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
    return bluebird.resolve();
  }

  return bluebird.try(connect)
    .then(subscribe);
}

module.exports = init;
