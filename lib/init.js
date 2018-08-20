'use strict';

const bluebird = require('bluebird');
var setup = require('./setup'),
  lists = require('./lists'),
  routes = require('./routes'),
  db = require('./db'),
  bus = require('./bus'),
  log = require('./services/log').setup({file: __filename}),
  LISTS_INITIALIZED = false;


function initFunc(router, storage, busPublish, sites) {
  // Pass the storage module to the db service
  db(storage);

  // Mount the routes
  routes(router);

  // Initialize the lists
  if (!LISTS_INITIALIZED) {
    LISTS_INITIALIZED = true;
    return lists(sites)
      .catch(e => {
        log('error', `Error initialzing lists: ${e.message}`, { stack: e.stack });
      });
  }

  return Promise.resolve();
}

/**
 * Add all the sites to the Sites index.
 *
 * @param {Object} options
 * @returns {Function}
 */
function onInit(options) {
  return setup(options)
    .then(bus) // Subscribe to the bus once
    .then(() => initFunc)
    .catch(err => {
      log('fatal', `${err.message}`, {
        stack: err.stack
      });
      return bluebird.reject(err);
    });
}

module.exports = onInit;

// For testing
module.exports.setInitialized = mock => LISTS_INITIALIZED = mock;
module.exports.setSetup  = mock => setup = mock;
module.exports.setRoutes = mock => routes = mock;
module.exports.setBus    = mock => bus = mock;
module.exports.setLog    = mock => log = mock;
module.exports.setLists  = mock => lists = mock;
