'use strict';

// Setup the ES client and other startup tasks
module.exports.setup = require('./lib/setup');

// Hooks
module.exports.routes = require('./lib/routes');
module.exports.init = require('./lib/init');
module.exports.save = require('./lib/save');

// Export helper functions for indices in a Clay instance
module.exports.elastic = require('./lib/services/elastic');
module.exports.helpers = require('./lib/services/elastic-helpers');
module.exports.filters = require('./lib/services/filters');
