'use strict';

const _ = require('lodash'),
  usersList = require('./users-list'),
  USERS_OP = '/users/';

/**
 * Test for @scheduled when a delete is run and update
 * the page list entry
 * @param  {Array} ops
 * @returns {Promise}
 */
function onDelete(ops) {
  var userDeletes = _.filter(ops, op => {
      return op.key.indexOf(USERS_OP) === 0;
    }),
    promises = [];

  if (userDeletes.length) {
    promises.push(usersList.removeUsers(userDeletes));
  }

  return Promise.all(promises);
}

module.exports = onDelete;
