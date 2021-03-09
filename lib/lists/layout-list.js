'use strict';

const _ = require('lodash'),
  { isLayout, replaceVersion } = require('clayutils'),
  { indexWithPrefix } = require('../services/elastic-helpers');

/**
 * Returns True if a provided object has a 'key' attribute that represents
 * a layout. This method also supports a legacy 'uri' value in place of 'key'.
 *
 * @param {object} opts
 * @param {string} opts.key or opts.uri: A clay object's id.
 * @returns {boolean} true if key represents a layout, else false
 */
function filter({ key, uri }) {
  return isLayout(key || uri);
}

/**
 * Validates a layout operation by checking parameter types.
 * This function accepts the legacy style arguments { uri, data }
 * and newer arguments that match the 'save' handler format { key, value }.
 *
 * @param {object} opts
 * @param {string} opts.key or opts.uri: A layout URI/id.
 * @param {object} opts.value or opts.data: A layout's metadata.
 * @return {object}
 */
function serialize({ key, value, uri, data }) {
  const k = key || uri;
  const v = value || data;

  if (!_.isObject(v)) {
    throw new TypeError(`Layout data must be an object, got ${typeof v} ${v}`);
  }

  if (!_.isString(k)) {
    throw new TypeError(`Layout uri must be a string, got ${typeof k} ${k}`);
  }

  return { key: replaceVersion(k), value: v };
}

module.exports.index = () => indexWithPrefix('layouts');
module.exports.filter = filter;
module.exports.serialize = serialize;
