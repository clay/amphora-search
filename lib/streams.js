'use strict';

const h = require('highland'),
  _cloneDeep = require('lodash/cloneDeep'),
  PUB_STREAM = h(),
  SAVE_STREAM = h();

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
    .map(function (op) {
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
    case 'publish':
      return PUB_STREAM.fork().map(pubToStream);
    case 'save':
      return SAVE_STREAM.fork().map(ops => h(_cloneDeep(ops)));
    default:
      log('error', 'Stream `subscribe` called with an invalid event!');
  }
}

module.exports.subscribe = subscribe;
module.exports.publishStream = PUB_STREAM;
module.exports.saveStream = SAVE_STREAM;

// For testing
module.exports.pubToStream = pubToStream;
module.exports.setLog = function (customLog) {
  log = customLog;
};
