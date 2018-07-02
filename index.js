'use strict';

const elastic = require('./lib/services/elastic'),
  helpers = require('./lib/services/elastic-helpers'),
  streams = require('./lib/streams');

// Setup the ES client and other startup tasks
module.exports.setup = require('./lib/setup');

// Hooks
module.exports.subscribe = streams.subscribe;
module.exports.routes = require('./lib/routes');
module.exports.init = require('./lib/init');

// Need to require these somewhere to register listeners
require('./lib/layout-list/publish');
require('./lib/page-list/create');
require('./lib/page-list/publish');
require('./lib/page-list/unpublish');
require('./lib/page-list/schedule');
require('./lib/page-list/unschedule');

// Export helper functions for indices in a Clay instance
module.exports.elastic = elastic;
module.exports.getInstance = elastic.getInstance;
module.exports.helpers = helpers;
module.exports.filters = require('./lib/services/filters');

// Page List & Other Helpers
module.exports.stripPrefix = helpers.stripPrefix;
module.exports.indexWithPrefix = helpers.indexWithPrefix;
