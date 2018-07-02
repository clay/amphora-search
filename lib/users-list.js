'use strict';

const h = require('highland'),
  elastic = require('./services/elastic'),
  helpers = require('./services/elastic-helpers'),
  { createOpFilter } = require('./services/filters'),
  { subscribe } = require('./streams'),
  USER_STRING = '/_users/',
  USER_FILTER = createOpFilter('users');
var USERS_INDEX,
  log = require('./services/log').setup({file: __filename});

/**
 * Subscribe to the stream of save operations coming from
 * Amphora and process them as they come through. Steps:
 *
 * 1. Filter ops related to users (check the `key` property)
 * 2. Send the user object to Elastic
 * 3. Log the result. Keep success to debug and errors should be logged
 */
subscribe('save')
  .parallel(25)
  .filter(USER_FILTER)
  .flatMap(updateUserList)
  .each(handleResult);

subscribe('delete')
  .parallel(25)
  .filter(USER_FILTER)
  .flatMap(removeUser)
  .each(resp => {
    if (!(resp instanceof Error)) {
      log('debug', `User data removed for user: ${resp._id}`);
    }
  });

/**
 * Setup the users index with prefix
 */
function setUsersIndex() {
  USERS_INDEX = helpers.indexWithPrefix('users');
}

/**
 * Log the result of the Elastic op
 *
 * @param  {Error|Object} resp
 */
function handleResult(resp) {
  if (resp instanceof Error) {
    log('error', resp.message);
    return;
  }

  log('debug', `User data updates for user: ${resp._id}`);
}

/**
 * Update a user's entry in the user index.
 *
 * @param  {Object} key
 * @param  {Object} value
 * @return {Stream}
 */
function updateUserList({ key, value }) {
  var userData = JSON.parse(value),
    key = key.replace(USER_STRING, '');

  return h(
    elastic.update(USERS_INDEX, key, userData, false, true)
      .catch(err => err)
  );
}

/**
 * Remove a user from the users index
 *
 * @param {String} user
 * @returns {Stream}
 */
function removeUser({ key }) {
  return h(elastic.del(USERS_INDEX, key.replace(USER_STRING, '')).catch(e => e));
}

module.exports.updateUserList = updateUserList;
module.exports.setUsersIndex = setUsersIndex;
module.exports.removeUser = removeUser;

// For testing
module.exports.handleResult = handleResult;
module.exports.setLog = (fakeLog) => { log = fakeLog; };
