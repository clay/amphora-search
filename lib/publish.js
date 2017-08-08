'use strict';

const _ = require('lodash'),
  setup = require('./setup');

/**
 * Publish hook
 *
 * @param  {Object} payload
 * @return {Promise}
 */
function publish(payload) {
  _.each(setup.handlers, (handler) => {
    if (_.isFunction(handler.publish)) {
      handler.publish(_.cloneDeep(payload));
    }
  });
}

module.exports = publish;
