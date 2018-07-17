'use strict';

const _ = require('lodash'),
  files = require('amphora-fs'),
  path = require('path'),
  es = require('./services/elastic');

var mappings = {},
  settings = {},
  handlers = {},
  ALREADY_RUN = false;

/**
 * Load the mappings from the mappings folder.
 *
 * The name of the file becomes the name of the index (convention over configuration).
 * @param {String} mappingDir
 */
function loadMappingConfiguration(mappingDir) {
  const list = files.getFiles(mappingDir);

  _.each(list, filename => {
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
 * Setup all necessary parts else necessary to use Elastic
 * TODO: BETTER DOCS PLZ
 *
 * @param  {Object} options
 * @return {Promise}
 */
function setup(options) {
  if (ALREADY_RUN) { // Run this once
    return Promise.resolve();
  }
  // Make the options accessible
  module.exports.options = options;

  // Grab the mappings from the specified directory
  if (!options.skipMappings) {
    loadMappingConfiguration(path.resolve(process.cwd(), './search/mappings'));
    loadMappingConfiguration(path.resolve(__dirname, '../mappings'));
  }

  if (!options.skipHandlers) {
    loadHandlers(path.resolve(process.cwd(), './search/handlers'));
  }

  // Set prefix
  module.exports.prefix = process.env.ELASTIC_PREFIX || '';

  // Setup the ES client
  es.setup(module.exports.host);

  // Ok, we need to make sure we don't run this again
  ALREADY_RUN = true;

  // Validate and create the indices
  return es.validateIndices(mappings, settings, module.exports.prefix);
}

module.exports = setup;
module.exports.options = {};
module.exports.mappings = {};
module.exports.settings = {};
module.exports.handlers = {};
module.exports.prefix = '';
module.exports.loadHandlers = loadHandlers;
