'use strict';

const _ = require('lodash'),
  setup = require('./setup'),
  bluebird = require('bluebird');

/**
 * Trigger handlers that are exported from
 * the handler modules in the Clay instance
 *
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

module.exports = executeHandlers;
