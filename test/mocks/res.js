'use strict';

const stream = require('stream');

function createRes() {
  const writable = stream.Writable();

  Object.assign(writable, {
    send: jest.fn(),
    type: jest.fn(),
    redirect: jest.fn(),
    _write: (chunk, enc, next) => {
      next();
    }
  });

  return writable;
}

module.exports = createRes;
