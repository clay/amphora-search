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

module.exports = { setMappings, setSettings, setHandlers, setOptions, mappings, settings, handlers, options };
