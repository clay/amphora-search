'use strict';

const _ = require('lodash'),
  elastic = require('./services/elastic'),
  helpers = require('./services/elastic-helpers'),
  log = require('./services/log').withStandardPrefix(__dirname); // TODO: Use passed in logger?

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
 * @return {Promise}
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
  key = userOp.key.replace('/users/', '');

  return elastic.update(USERS_INDEX, 'general', key, userData, false, true)
    .then(function (result) {
      log('info', `User data updates for user: ${result._id}`);
      return result;
    }).catch(function (error) {
      log('error', error.stack);
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
    return op.key.indexOf('/users/') > -1;
  });
}

module.exports.testForUser = testForUser;
module.exports.updateUserList = updateUserList;
module.exports.setUsersIndex = setUsersIndex;
