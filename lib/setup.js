'use strict';

const _ = require('lodash'),
  files = require('amphora-fs'),
  path = require('path'),
  es = require('./services/elastic');

var mappings = {},
  settings = {};

/**
 * Load the mappings from the mappings folder.
 *
 * The name of the file becomes the name of the index (convention over configuration).
 * @param {String} mappingDir
 */
function loadMappingConfiguration(mappingDir) {
  _.each(files.getFiles(mappingDir), filename => {
    const mappingName = filename.split('.')[0],
      mapping = files.getYaml(path.join(mappingDir, mappingName));

    if (mappingName && mapping) {
      mappings[mappingName] = _.omit(mapping, 'settings');

      if (mapping.settings) {
        settings[mappingName] = _.pick(mapping, 'settings');
      }
    }
  });

  // Export the objects so we can use it elsewhere
  module.exports.mappings = mappings;
  module.exports.settings = settings;
}
/**
 * Setup all necessary parts else necessary to use Elastic
 * TODO: BETTER DOCS PLZ
 *
 * @param  {Object} options
 * @return {Promise}
 */
function setup(options = {}) {
  // Make the options accessible
  module.exports.options = options;

  // Grab the mappings from the specified directory
  if (!options.skipMappings) {
    loadMappingConfiguration(path.resolve(process.cwd(), './search/mappings'));
    loadMappingConfiguration(path.resolve(__dirname, '../mappings'));
  }

  // Set prefix
  module.exports.prefix = process.env.ELASTIC_PREFIX || '';

  // Setup the ES client
  es.setup(module.exports.host);

  // Validate and create the indices
  return es.validateIndices(mappings, settings, module.exports.prefix);
}

module.exports = setup;
module.exports.options = {};
module.exports.mappings = {};
module.exports.settings = {};
module.exports.prefix = '';
module.exports.loadMappingConfiguration = loadMappingConfiguration;
