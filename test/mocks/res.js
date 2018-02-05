'use strict';

const sinon = require('sinon'),
  stream = require('stream');

function createRes() {
  const writable = stream.Writable();

  Object.assign(writable, {
    send: sinon.spy(),
    type: sinon.spy(),
    redirect: sinon.spy(),
    _write: (chunk, enc, next) => {
      console.log(chunk);
      next();
    }
  });

  return writable;
}

module.exports = createRes;
