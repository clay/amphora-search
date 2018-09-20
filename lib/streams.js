'use strict';

const _ = require('lodash'),
  h = require('highland'),
  { BUS_NAMESPACE, BUS_TOPICS } = require('./constants'),
  STREAMS = {}; // Placeholder to be filled with streams

/**
 * Get a fork of a specific Stream that corresponds
 * to an event from Amphora
 *
 * @param  {String} e
 * @return {Stream}
 */
function subscribe(e) {
  if (BUS_TOPICS.indexOf(e) === -1) {
    throw new Error('Stream `subscribe` called with an invalid event!');
  }

  if (e === 'save' || e === 'delete') {
    return STREAMS[e].fork().map(ops => h(_.cloneDeep(ops)));
  }

  return STREAMS[e].fork().map(_.cloneDeep);
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
