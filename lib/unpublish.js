'use strict';

const _ = require('lodash'),
  setup = require('./setup');


/**
 * Trigger unpublish handlers that are exported from
 * the handler modules in the Clay instance
 *
 * @param {Object} unpubbedPage
 */
function executeUnpubHandlers(unpubbedPage) {
  _.each(setup.handlers, (handler) => {
    /* istanbul ignore else */
    if (_.isFunction(handler.unpublish)) {
      handler.unpublish(_.cloneDeep(unpubbedPage));
    }
  });
}

/**
 * Reset values when a page is unpublished
 *
 * @param  {Object} payload
 */
function unpublish({ uri, url }) {
  // Send to handlers
  module.exports.executeUnpubHandlers({uri, url});
}

module.exports = unpublish;
module.exports.executeUnpubHandlers = executeUnpubHandlers;
