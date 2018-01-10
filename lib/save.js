'use strict';

const _ = require('lodash'),
  setup = require('./setup'),
  bluebird = require('bluebird'),
  pageList = require('./page-list'),
  usersList = require('./users-list');

/**
 * Trigger handlers that are exported from
 * the handler modules in the Clay instance
 * @param {Array} ops
 */
function executeHandlers(ops) {
  _.each(setup.handlers, (handler) => {
    let clonedOps = _.cloneDeep(ops); // Need to prevent mutability

    if (_.isFunction(handler.when)) {
      bluebird.try(handler.when.bind(null, clonedOps))
        .then(resp => {
          if (resp) {
            handler.save(clonedOps);
          }
        });
    }
  });
}

/**
 * Handler for the `save` hook fired from Amphora Core
 * module. Sends ops to Page List if a page is present
 * and then triggers the save handlers hook.
 * @param  {Array} ops
 */
function onSave(ops) {
  if (!_.isArray(ops)) {
    return;
  }

  // Test for a user
  if (usersList.testForUser(_.cloneDeep(ops)).length) {
    usersList.updateUserList(_.cloneDeep(ops));
  }

  // Run logic for Clay instance indexing
  module.exports.executeHandlers(ops);
}

module.exports = onSave;
module.exports.executeHandlers = executeHandlers;
