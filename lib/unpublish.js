'use strict';

const _ = require('lodash'),
  pageList = require('./page-list'),
  setup = require('./setup');
var log = require('./services/log').setup({file: __filename});


/**
 * Trigger unpublish handlers that are exported from
 * the handler modules in the Clay instance
 *
 * @param {Object} unpubbedPage
 */
function executeUnpubHandlers(unpubbedPage) {
  _.each(setup.handlers, (handler) => {
    if (_.isFunction(handler.unpublish)) {
      handler.unpublish(_.cloneDeep(unpubbedPage));
    }
  });
}

/**
 * Reset values when a page is unpublished
 *
 * @param  {Object} payload
 * @return {Promise}
 */
function unpublish({ uri, url }) {
  // Send to handlers
  module.exports.executeUnpubHandlers({uri, url});

  // Update page list
  return pageList.updatePageData(uri, {
    published: false,
    scheduled: false,
    url: '',
    scheduledTime: null
  }).then(function (resp) {
    log('info', 'unpublished page updated:', uri);
    return resp;
  }).catch(function (err) {
    log('error', 'error update page list for unpublish', err.stack);
    return err;
  });
}

/**
 * Assign a logger so we can test logging
 *
 * @param {Function} customLog
 */
function setLog(customLog) {
  log = customLog;
}

module.exports = unpublish;
module.exports.setLog = setLog; // For testing
module.exports.executeUnpubHandlers = executeUnpubHandlers;
