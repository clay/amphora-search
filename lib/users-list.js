'use strict';

const _ = require('lodash'),
  h = require('highland'),
  elastic = require('./services/elastic'),
  helpers = require('./services/elastic-helpers'),
  { createOpFilter } = require('./services/filters'),
  { subscribe } = require('./streams'),
  USER_STRING = '/users/',
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
 * @param  {Object} op
 * @return {Stream}
 */
function updateUserList(op) {
  var userData = JSON.parse(op.value),
    key = op.key.replace(USER_STRING, '');

  return h(
    elastic.update(USERS_INDEX, key, userData, false, true)
      .catch(err => err)
  );
}

/**
 * Iterate through ops and delete each user
 *
 * @param  {Array} ops
 */
function removeUsers(ops) {
  _.map(ops, op => {
    elastic.del(USERS_INDEX, op.key.replace(USER_STRING, ''))
      .then(resp => {
        log('debug', `User data removed from index for user: ${resp._id}`);
      });
  });
}

module.exports.updateUserList = updateUserList;
module.exports.setUsersIndex = setUsersIndex;
module.exports.removeUsers = removeUsers;

// For testing
module.exports.handleResult = handleResult;
module.exports.setLog = (fakeLog) => { log = fakeLog; };
