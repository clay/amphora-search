'use strict';

const _ = require('lodash'),
  files = require('nymag-fs'),
  path = require('path'),
  es = require('./services/elastic'),
  glob = require('glob');

var mappings = {};

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
  // Validate and create the indices
  return es.validateIndices(mappings);
}

module.exports = setup;
module.exports.options = {};
