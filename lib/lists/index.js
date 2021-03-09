'use strict';

const { subscribe } = require('../streams'),
  pageList = require('./page-list'),
  layoutList = require('./layout-list'),
  reindex = require('../services/reindex'),
  userList = require('./user-list'),
  sitesList = require('./sites-list'),
  state = require('../services/state');
var log = require('../services/log').setup({ file: __filename }),
  RUN_INTERNAL_PROCESS = process.env.AMPHORA_SEARCH_UPDATE_LISTS !== 'false';

function setSubscribers() {
  if (RUN_INTERNAL_PROCESS) {
    // For meta updates
    subscribe('saveMeta', { id: 'pages' })
      .filter(pageList.filter)
      .map(pageList.serialize)
      .through(reindex.batchUpsert(pageList.index()));

    subscribe('saveMeta', { id: 'layouts' })
      .filter(layoutList.filter)
      .map(layoutList.serialize)
      .through(reindex.batchUpsert(layoutList.index()));

    // For adding to users index
    subscribe('saveUser', { id: 'users' })
      .filter(userList.filter)
      .map(userList.serialize)
      .through(reindex.batchUpsert(userList.index()));

    // For removing from users index
    subscribe('deleteUser', { id: 'users' })
      .flatMap(userList.removeUser)
      .errors(handleErrors)
      .each(logStatus);
  }
}

/**
 * Log an error with updating page documents
 *
 * @param {Error} err
 */
function handleErrors(err) {
  log('error', 'Error processing document update', {
    msg: err.message
  });
}

/**
 * Log the result of the update
 *
 * @param {Object} resp
 */
function logStatus(resp) {
  log('debug', `Document ${resp.result}`, { _id: resp._id });
}

/**
 * Make sure we set the proper indices for
 * each list and then setup the sites index
 *
 * @param {Object} sitesService
 * @returns {Promise}
 */
function setup(sitesService) {
  state.addSitesService(sitesService);

  return sitesList.create(sitesService);
}

setSubscribers(); // runs when the file is required

module.exports = setup;
// For testing
module.exports.handleErrors = handleErrors;
module.exports.logStatus = logStatus;
module.exports.setLog = mock => log = mock;
module.exports.setSubscribers = setSubscribers;
module.exports.setInternal = mock => RUN_INTERNAL_PROCESS = mock;
