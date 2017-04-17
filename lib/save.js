'use strict';

const _ = require('lodash'),
  setup = require('./setup'),
  pageList = require('./page-list'),
  filters = require('./services/filters');

/**
 * [executeHandlers description]
 * @return [type] [description]
 */
function executeHandlers(ops) {
  _.each(setup.handlers, (handler) => {
    if (handler.when(ops)) {
      handler.save(ops);
    }
  });
}


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
