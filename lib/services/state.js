'use strict';

let mappings = {},
  settings = {},
  handlers = {},
  options = {};

function setMappings(newMappings) {
  mappings = newMappings;
}

function setSettings(newSettings) {
  settings = newSettings;
}

function setHandlers(newHandlers) {
  handlers = newHandlers;
}

function setOptions(newOptions) {
  options = newOptions;
}

module.exports = { setMappings, setSettings, setHandlers, setOptions, mappings, settings, handlers, options };
