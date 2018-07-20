'use strict';

const bluebird = require('bluebird');
var setup = require('./setup'),
  lists = require('./lists'),
  routes = require('./routes'),
  db = require('./db'),
  bus = require('./bus'),
  log = require('./services/log').setup({file: __filename});

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
module.exports.setSetup  = mock => setup = mock;
module.exports.setRoutes = mock => routes = mock;
module.exports.setBus    = mock => bus = mock;
module.exports.setLog    = mock => log = mock;
module.exports.setLists  = mock => lists = mock;
