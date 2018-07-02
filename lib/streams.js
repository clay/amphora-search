'use strict';

const h = require('highland'),
  _cloneDeep = require('lodash/cloneDeep'),
  { BUS_TOPICS } = require('./constants'),
  STREAMS = {}; // Placeholder to be filled with streams
var log = require('./services/log').setup({file: __filename});

/**
 * On publish, we want to squash the page uri that
 * just got published into every op, just to make
 * sure every op can reference its page on its own
 * without maintaining the uri in memory somewhere.
 *
 * @param  {String} uri
 * @param  {Array} ops
 * @return {Stream}
 */
function pubToStream({ uri, ops }) {
  return h(_cloneDeep(ops))
    .map(op => {
      op.pageUri = uri;
      return op;
    });
}

/**
 * Get a fork of a specific Stream that corresponds
 * to an event from Amphora
 *
 * @param  {String} e
 * @return {Stream}
 */
function subscribe(e) {
  switch (e) {
    case 'createPage':
      return STREAMS.createPage.fork();
    case 'publishPage':
      return STREAMS.publishPage.fork();
    case 'unpublishPage':
      return STREAMS.unpublishPage.fork();
    case 'schedulePage':
      return STREAMS.schedulePage.fork();
    case 'unschedulePage':
      return STREAMS.unschedulePage.fork();
    case 'publishLayout':
      return STREAMS.publishLayout.fork();
    case 'save':
      return STREAMS.save.fork().map(ops => h(_cloneDeep(ops)));
    case 'delete':
      return STREAMS.delete.fork().map(ops => h(_cloneDeep(ops)));
    default:
      log('error', 'Stream `subscribe` called with an invalid event!');
  }
}

/**
 * Assign streams and export all streams
 */
for (let i = 0; i < BUS_TOPICS.length; i++) {
  let topic = BUS_TOPICS[i];

  STREAMS[topic] = h(); // Make a new stream
  module.exports[`clay:${topic}`] = STREAMS[topic]; // Export stream under full topic
}

module.exports.subscribe = subscribe;

// For testing
module.exports.pubToStream = pubToStream;
module.exports.setLog = mock => log = mock;
