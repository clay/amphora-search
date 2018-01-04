'use strict';

const h = require('highland'),
  PUB_STREAM = h().through(addPageToOp),
  SAVE_STREAM = h();

function init(db) {
  db.eventStreams.publish
    .pipe(PUB_STREAM);

  db.eventStreams.save
    .pipe(SAVE_STREAM);
}

function addPageToOp(stream) {
  return stream
    .map(function ({ uri, ops }) {
      return ops
        // Add the page uri to each op
        .consume(function (err, x, push, next) {
          if (x === h.nil) {
            push(null, x);
          } else {
            x.pageUri = uri;

            push(null, x);
            next();
          }
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

module.exports.init = init;
module.exports.subscribe = subscribe;
