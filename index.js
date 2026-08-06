'use strict';

const elastic = require('./lib/services/elastic'),
  helpers = require('./lib/services/elastic-helpers'),
  streams = require('./lib/streams');

// Initialize the module
module.exports = require('./lib/init');

// Allow subscription to Streams
module.exports.subscribe = streams.subscribe;
module.exports.on = streams.on;

// Consumers that own their own event source (nymag/sites publishes in-process) call this instead
// of going back out over redis.
module.exports.dispatch = streams.dispatch;

// Export helper functions for indices in a Clay instance
module.exports.elastic = elastic;
module.exports.getInstance = elastic.getInstance;
module.exports.helpers = helpers;
module.exports.filters = require('./lib/services/filters');

// Page List & Other Helpers
module.exports.stripPrefix = helpers.stripPrefix;
module.exports.indexWithPrefix = helpers.indexWithPrefix;
