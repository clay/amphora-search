'use strict';

const _ = require('lodash'),
  h = require('highland'),
  { BUS_NAMESPACE, BUS_TOPICS } = require('./constants'),
  STREAMS = {}; // Placeholder to be filled with streams

/**
 * Get a fork of a specific Stream that corresponds
 * to an event from Amphora
 *
 * @param {string} e: The name of an event source.
 * @param {object} opts
 * @param {string} opts.id: An optional explicit ID to use for the stream.
 * @return {stream}
 */
function subscribe(e, { id } = {}) {
  if (BUS_TOPICS.indexOf(e) === -1) {
    throw new Error('Stream `subscribe` called with an invalid event!');
  }

  const consumer = STREAMS[e].fork();

  if (id) {
    consumer.id = `${e}:${id}`;
  }

  if (e === 'save' || e === 'delete') {
    return consumer.map(ops => h(_.cloneDeep(ops)));
  }

  return consumer.map(_.cloneDeep);
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
