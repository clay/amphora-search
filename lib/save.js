'use strict';

const _ = require('lodash'),
  filters = require('./services/ops-filters');

/**
 * Filter out ops that aren't `pages` and `puts`
 * @param  {Array} ops
 * @return {Array}
 */
function filterForPageOps(ops) {
  ops = _.filter(ops, filters.isPageOp);
  return ops = _.filter(ops, filters.isPutOp);
}


function onSave(ops) {
  if (!_.isArray(ops)) {
    return;
  }

  var filteredOps = filterForPageOps(ops);

}

module.exports = onSave;
