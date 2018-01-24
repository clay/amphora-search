'use strict';

const elastic = require('./lib/services/elastic'),
  helpers = require('./lib/services/elastic-helpers'),
  streams = require('./lib/streams');

// Setup the ES client and other startup tasks
module.exports.setup = require('./lib/setup');

// Hooks
module.exports.subscribe = streams.subscribe;
module.exports.publishStream = streams.publishStream;
module.exports.saveStream = streams.saveStream;
module.exports.routes = require('./lib/routes');
module.exports.init = require('./lib/init');
module.exports.save = require('./lib/save');
module.exports.delete = require('./lib/delete');
module.exports.publish = require('./lib/publish');
module.exports.unpublish = require('./lib/unpublish');
// Page List Hooks
module.exports.createPage = require('./lib/page-list/create');
module.exports.publishPage = require('./lib/page-list/publish');
module.exports.unpublishPage = require('./lib/page-list/unpublish');
module.exports.schedulePage = require('./lib/page-list/schedule');
module.exports.unschedulePage = require('./lib/page-list/unschedule');

// Export helper functions for indices in a Clay instance
module.exports.elastic = elastic;
module.exports.getInstance = elastic.getInstance;
module.exports.helpers = helpers;
module.exports.filters = require('./lib/services/filters');

// Page List & Other Helpers
module.exports.stripPrefix = helpers.stripPrefix;
module.exports.indexWithPrefix = helpers.indexWithPrefix;
