'use strict';

const bluebird = require('bluebird'),
  redis = bluebird.promisifyAll(require('redis')),
  streams = require('./streams'),
  { BUS_TOPICS } = require('./constants');
var client;

function connect() {
  client = redis.createClient(process.env.REDIS_BUS_HOST);
}

function init() {
  if (!process.env.REDIS_BUS_HOST) {
    throw new Error('REDIS_BUS_HOST env var is not set! Amphora Search cannot initialize');
  }

  return bluebird.try(connect)
    .then(() => {
      for (let i = 0; i < BUS_TOPICS.length; i++) {
        client.subscribe(`clay:${BUS_TOPICS[i]}`);
      }

      dispatch();
    });
}

function dispatch() {
  client.on('message', (topic, payload) => streams[topic].write(JSON.parse(payload)));
}

module.exports = init;
