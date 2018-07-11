'use strict';

const elastic = require('./lib/services/elastic'),
  helpers = require('./lib/services/elastic-helpers'),
  streams = require('./lib/streams');

// Initialize the module
module.exports = require('./lib/init');
// Setup the ES client and other startup tasks
module.exports.setup = require('./lib/setup');
// Allow subscription to Streams
module.exports.subscribe = streams.subscribe;

// Export helper functions for indices in a Clay instance
module.exports.elastic = elastic;
module.exports.getInstance = elastic.getInstance;
module.exports.helpers = helpers;
module.exports.filters = require('./lib/services/filters');

// Page List & Other Helpers
module.exports.stripPrefix = helpers.stripPrefix;
module.exports.indexWithPrefix = helpers.indexWithPrefix;

// Need to require these somewhere to register listeners
require('./lib/layout-list/publish');

// require('./lib/page-list/schedule');
// require('./lib/page-list/unschedule');
