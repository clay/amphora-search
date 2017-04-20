'use strict';

const _ = require('lodash'),
  setup = require('./setup'),
  pageList = require('./page-list');

/**
 * Trigger handlers that are exported from
 * the handler modules in the Clay instance
 * @param {Array} ops
 */
function executeHandlers(ops) {
  _.each(setup.handlers, (handler) => {
    if (handler.when(ops)) {
      handler.save(ops);
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

  // Pass saves through the test for the pagelist
  if (pageList.filterForPageOps(ops).length) {
    pageList.updatePageList(ops);
  }

  // Run logic for Clay instance indexing
  executeHandlers(ops);
}

module.exports = onSave;
