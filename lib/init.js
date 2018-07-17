'use strict';

const setup = require('./setup'),
  bluebird = require('bluebird'),
  lists = require('./lists'),
  routes = require('./routes'),
  db = require('./db'),
  bus = require('./bus');
let log = require('./services/log').setup({file: __filename});

/**
 * Add all the sites to the Sites index.
 *
 * @param {Object} options
 * @returns {Function}
 */
function onInit(options) {
  return (router, storage, busPublish, sites) => {
    return setup(options)
      .then(() => db(storage))
      .then(() => routes(router))
      .then(bus)
      .then(() => lists(sites))
      .catch(err => {
        log('fatal', `${err.message}`, {
          stack: err.stack
        });
        return bluebird.reject(err);
      });
  };
}

module.exports = onInit;

// For testing
module.exports.setSites = mock => setup.options.sites = mock;
module.exports.setLog = mock => log = mock;
