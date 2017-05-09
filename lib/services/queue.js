'use strict';

const Queue = require('promise-queue'),
  _ = require('lodash'),
  queue = new Queue(1, Infinity);


function add(promise) {
  return queue.add(promise);
}

module.exports.add = add;
