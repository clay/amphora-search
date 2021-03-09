'use strict';

const _ = require('lodash'),
  { isPage, replaceVersion } = require('clayutils'),
  { indexWithPrefix } = require('../services/elastic-helpers');

/**
 * Returns True if a provided object has a 'key' attribute that represents
 * a page. This method also supports a legacy 'uri' value in place of 'key'.
 *
 * @param {object} opts
 * @param {string} opts.key or opts.uri: A clay object's id.
 * @returns {boolean} true if key represents a page, else false
 */
function filter({ key, uri }) {
  return isPage(key || uri);
}

/**
 * Validates a page operation by checking parameter types.
 * This function accepts the legacy style arguments { uri, data }
 * and newer arguments that match the 'save' handler format { key, value }.
 *
 * @param {object} opts
 * @param {string} opts.key or opts.uri: A page URI/id.
 * @param {object} opts.value or opts.data: A page's metadata.
 * @return {object}
 */
function serialize({ key, value, uri, data }) {
  const k = key || uri;
  const v = value || data;

  if (!_.isObject(v)) {
    throw new TypeError(`Page data must be an object, got ${typeof v} ${v}`);
  }

  if (!_.isString(k)) {
    throw new TypeError(`Page uri must be a string, got ${typeof k} ${k}`);
  }

  return { key: replaceVersion(k), value: v };
}

module.exports.filter = filter;
module.exports.serialize = serialize;
module.exports.index = () => indexWithPrefix('pages');
