'use strict';

function init(storage) {
  module.exports.db = storage;

  return Promise.resolve();
}

module.exports = init;
