'use strict';

const _ = require('lodash'),
  elastic = require('./services/elastic'),
  helpers = require('./services/elastic-helpers'),
  log = require('./services/log').setup({file: __filename}),
  USER_STRING = '/_users/';

var USERS_INDEX;

/**
 * Setup the users index with prefix
 */
function setUsersIndex() {
  USERS_INDEX = helpers.indexWithPrefix('users');
}

/**
 * Update a user's entry in the user index.
 *
 * @param  {Array} ops
 * @return {Promise|Undefined}
 */
function updateUserList(ops) {
  var userOp = testForUser(ops)[0],
    userData, key;

  if (!userOp) {
    return;
  }

  // Parse out the user values
  userData = JSON.parse(userOp.value);
  // Grab the unique key
  key = userOp.key.replace(USER_STRING, '');

  return elastic.update(USERS_INDEX, 'general', key, userData, false, true)
    .then(function (result) {
      log('debug', `User data updates for user: ${result._id}`);
      return result;
    }).catch(function (error) {
      log('error', error);
      return error;
    });
}

/**
 * Test for ops around users
 *
 * @param  {Array} ops
 * @return {Array}
 */
function testForUser(ops) {
  return _.filter(ops, op => {
    return op.key.indexOf(USER_STRING) === 0;
  });
}

/**
 * Iterate through ops and delete each user
 *
 * @param  {Array} ops
 */
function removeUsers(ops) {
  _.map(ops, op => {
    elastic.del(USERS_INDEX, 'general', op.key.replace(USER_STRING, ''))
      .then(resp => {
        log('debug', `User data removed from index for user: ${resp._id}`);
      });
  });
}

module.exports.testForUser = testForUser;
module.exports.updateUserList = updateUserList;
module.exports.setUsersIndex = setUsersIndex;
module.exports.removeUsers = removeUsers;
