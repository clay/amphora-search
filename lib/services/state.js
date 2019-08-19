'use strict';

let mappings = {},
  settings = {},
  handlers = {},
  options = {};

function setMappings(newMappings) {
  module.exports.mappings = newMappings;
}

function setSettings(newSettings) {
  module.exports.settings = newSettings;
}

function setHandlers(newHandlers) {
  module.exports.handlers = newHandlers;
}

function setOptions(newOptions) {
  module.exports.options = newOptions;
}

/**
 * Sets the site service onto state.options so that lib/services/responses->redirectToLogin stops erroring
 *
 * @param {Object} sitesService
 */
function addSitesService(sitesService) {
  module.exports.options.sites = sitesService;
}

module.exports = {
  setMappings,
  setSettings,
  setHandlers,
  setOptions,
  addSitesService,
  mappings,
  settings,
  handlers,
  options
};
