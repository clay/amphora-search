'use strict';

const _ = require('lodash'),
  files = require('nymag-fs'),
  path = require('path'),
  es = require('./services/elastic'),
  glob = require('glob');

var mappings = {},
  handlers = {};

/**
 * Load the mappings from the mappings folder.
 *
 * The name of the file becomes the name of the index (convention over configuration).
 */
function loadMappingConfiguration(mappingDir) {
  const list = files.getFiles(mappingDir);

  _.each(list, function (filename) {
    const mappingName = filename.split('.')[0],
      mapping = files.getYaml(path.join(mappingDir, mappingName));

    if (mappingName && mapping) {
      mappings[mappingName] = mapping;
    }
  });

  // Export the object so we can use it elsewhere
  module.exports.mappings = mappings;
}

/**
 * Load in the handlers from the Clay instance
 *
 * @param  {String} handlersDir
 */
function loadHandlers(handlersDir) {
  const list = files.getFiles(handlersDir);

  _.each(list, function (file) {
    const splitFile = file.split('.');

    if (splitFile && splitFile[1] === 'js') {
      handlers[splitFile[0]] = require(path.resolve(handlersDir, splitFile[0]));
    }
  });

  module.exports.handlers = handlers;
}

/**
 * Setup indices, the `_search` endpoint and anything
 * else necessary to use Elastic
 *
 * @param  {Object} options
 * @return {Promise}
 */
function setup(options) {
  // Make the options accessible
  module.exports.options = options;
  // Setup the ES client
  es.setup();
  // Grab the mappings from the specified directory
  loadMappingConfiguration(options.mappings);
  // Grab indices managed by this plugin
  loadMappingConfiguration(path.resolve(__dirname, '../mappings'));
  // Load handlers
  loadHandlers(options.handlers);
  // Validate and create the indices
  return es.validateIndices(mappings);
}

module.exports = setup;
module.exports.options = {};
module.exports.mappings = {};
module.exports.handlers = {};
