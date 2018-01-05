'use strict';

const h = require('highland'),
  _cloneDeep = require('lodash/cloneDeep'),
  PUB_STREAM = h().through(pubToStream),
  SAVE_STREAM = h().map(ops => h(_cloneDeep(ops)));
var log = require('./services/log').setup({file: __filename});

/**
 * On publish, we want to squash the page uri that
 * just got published into every op, just to make
 * sure every op can reference its page on its own
 * without maintaining the uri in memory somewhere.
 *
 * @param  {Stream} stream
 * @return {Stream}
 */
function pubToStream(stream) {
  return stream
    .map(function ({ uri, ops }) {
      return h(_cloneDeep(ops))
        .map(function (op) {
          op.pageUri = uri;
          return op;
        });
    })
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
      return PUB_STREAM.fork();
    case 'save':
      return SAVE_STREAM.fork();
    default:
      log('error', 'Streams `subscribe` called with no event!');
  }
}

module.exports.subscribe = subscribe;
module.exports.publishStream = PUB_STREAM;
module.exports.saveStream = SAVE_STREAM;
