'use strict';

const _ = require('lodash'),
  h = require('highland'),
  elastic = require('../services/elastic'),
  { indexWithPrefix } = require('../services/elastic-helpers'),
  { isUser } = require('clayutils'),
  USER_STRING = '/_users/';

var log = require('../services/log').setup({file: __filename});

/**
 * Log the result of the Elastic op
 *
 * @param  {Error|Object} resp
 * @param  {String} msg
 */
function handleResult(resp, msg) {
  if (resp instanceof Error) {
    log('error', resp);
    return;
  }

  log('debug', `${msg}: ${resp._id}`);
}

/**
 * Returns True if a provided object has a 'key' attribute that represents
 * a user.
 *
 * @param {object} opts
 * @param {string} opts.key: A clay object's id.
 * @returns {boolean} true if key represents a user, else false
 */
function filter({ key }) {
  return isUser(key);
}

/**
 * @param  {Object} key
 * @param  {Object} value
 * @return {Stream}
 */
function serialize({ key, value }) {

  if (!_.isObject(value)) {
    throw new TypeError(`User value must be an object, got ${typeof value} ${value}`);
  }

  if (!_.isString(key)) {
    throw new TypeError(`User key must be a string, got ${typeof key} ${key}`);
  }

  return { key: key.replace(USER_STRING, ''), value };
}

/**
 * Remove a user from the users index
 *
 * @param {String} user
 * @returns {Stream}
 */
function removeUser({ uri }) {
  return h(elastic.del(module.exports.index(), uri.replace(USER_STRING, '')));
}

module.exports.index = () => indexWithPrefix('users');
module.exports.filter = filter;
module.exports.serialize = serialize;
module.exports.removeUser = removeUser;
module.exports.handleResult = handleResult;

// For testing
module.exports.setLog = mock => log = mock;
