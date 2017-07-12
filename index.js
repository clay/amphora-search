'use strict';

const elastic = require('./lib/services/elastic'),
  helpers = require('./lib/services/elastic-helpers');

// Setup the ES client and other startup tasks
module.exports.setup = require('./lib/setup');

// Hooks
module.exports.routes = require('./lib/routes');
module.exports.init = require('./lib/init');
module.exports.save = require('./lib/save');
module.exports.unpublish = require('./lib/unpublish');

// Export helper functions for indices in a Clay instance
module.exports.elastic = elastic;
module.exports.getInstance = elastic.getInstance;
module.exports.helpers = helpers;
module.exports.filters = require('./lib/services/filters');

// Page List & Other Helpers
module.exports.updatePageProperty = require('./lib/page-list').updatePageEntry;
module.exports.stripPrefix = helpers.stripPrefix;
module.exports.indexWithPrefix = helpers.indexWithPrefix;
