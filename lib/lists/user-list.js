'use strict';

const h = require('highland'),
  elastic = require('../services/elastic'),
  { indexWithPrefix } = require('../services/elastic-helpers'),
  USER_STRING = '/_users/';
var USERS_INDEX,
  log = require('../services/log').setup({file: __filename});

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
 * Update a user's entry in the user index.
 *
 * @param  {Object} key
 * @param  {Object} value
 * @return {Stream}
 */
function updateUserList({ key, value:userData }) {
  key = key.replace(USER_STRING, '');

  return h(elastic.update(USERS_INDEX, key, userData, false, true));
}

/**
 * Remove a user from the users index
 *
 * @param {String} user
 * @returns {Stream}
 */
function removeUser({ uri }) {
  return h(elastic.del(USERS_INDEX, uri.replace(USER_STRING, '')));
}

module.exports.setUserIndex = () => USERS_INDEX = indexWithPrefix('users');
module.exports.updateUserList = updateUserList;
module.exports.removeUser = removeUser;
module.exports.handleResult = handleResult;

// For testing
module.exports.setLog = mock => log = mock;
