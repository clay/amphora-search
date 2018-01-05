'use strict';

const h = require('highland'),
  _cloneDeep = require('lodash/cloneDeep'),
  PUB_STREAM = h().through(pubToStream),
  SAVE_STREAM = h().map(ops => h(_cloneDeep(ops)));

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

function subscribe(e) {
  switch (e) {
    case 'publish':
      console.log('publish!');
      return PUB_STREAM.fork();
    case 'save':
      console.log(`save!`);
      return SAVE_STREAM.fork();
      break;
    case 'delete':
      console.log(`delete!`);
      break;
    default:
      console.log(`womp`);
  }
}

module.exports.subscribe = subscribe;
module.exports.publishStream = PUB_STREAM;
module.exports.saveStream = SAVE_STREAM;
