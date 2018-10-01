'use strict';

const _ = require('lodash'),
  files = require('amphora-fs'),
  path = require('path'),
  es = require('./services/elastic'),
  state = require('./services/state'),
  { prefix } = require('./constants'),
  mappings = {},
  settings = {},
  handlers = {};

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
  state.setMappings(mappings);
  state.setSettings(settings);
}

/**
 * Load in the handlers from the Clay instance
 *
 * @param  {String} handlersDir
 */
function loadHandlers(handlersDir) {
  _.each(files.getFiles(handlersDir), file => {
    const splitFile = file.split('.');

    if (splitFile && splitFile[1] === 'js') {
      handlers[splitFile[0]] = require(path.resolve(handlersDir, splitFile[0]));
    }
  });

  state.setHandlers(handlers);
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
  state.setOptions(options);

  // Grab the mappings from the specified directory
  if (!options.skipMappings) {
    loadMappingConfiguration(path.resolve(process.cwd(), './search/mappings'));
    loadMappingConfiguration(path.resolve(__dirname, '../mappings'));
  }

  if (!options.skipHandlers) {
    loadHandlers(path.resolve(process.cwd(), './search/handlers'));
  }

  // Setup the ES client
  es.setup(module.exports.host);

  // Validate and create the indices
  return es.validateIndices(state.mappings, state.settings, prefix);
}

module.exports = setup;
module.exports.loadHandlers = loadHandlers;
module.exports.loadMappingConfiguration = loadMappingConfiguration;
