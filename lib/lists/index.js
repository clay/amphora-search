'use strict';

const { isLayout } = require('clayutils'),
  // Required as a namespace rather than destructured so `streams.on` is looked up at call time
  // and a test can stub it. (The previous `{ subscribe }` destructure meant the existing
  // "does not subscribe if false" test could only ever pass, mock or not.)
  streams = require('../streams'),
  pageList = require('./page-list'),
  layoutList = require('./layout-list'),
  userList = require('./user-list'),
  sitesList = require('./sites-list'),
  state = require('../services/state');
var log = require('../services/log').setup({ file: __filename }),
  RUN_INTERNAL_PROCESS = process.env.AMPHORA_SEARCH_UPDATE_LISTS !== 'false';

/**
 * Wrap a list updater so it keeps the contract the Highland chains had: log the result on
 * success, log the error on failure, and never reject. `dispatch` also guards against a
 * rejecting handler, but each of these owns its own success log, so they need the `then` anyway.
 *
 * @param {Function} update - `(payload) => Promise<Object>`
 * @returns {Function} a handler safe to hand to `on`
 */
function settleWith(update) {
  return payload => Promise.resolve()
    .then(() => update(payload))
    .then(logStatus)
    .catch(handleErrors);
}

function setSubscribers() {
  if (RUN_INTERNAL_PROCESS) {
    // For meta updates
    streams.on('saveMeta', settleWith(handleMetaSave));

    // For adding to users index
    streams.on('saveUser', settleWith(userList.updateUserList));

    // For removing from users index
    streams.on('deleteUser', settleWith(userList.removeUser));
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
 *
 * @param {Object} payload
 * @param {String} payload.uri
 * @param {Object} payload.data
 * @returns {Promise}
 */
function handleMetaSave({ uri, data }) {
  return isLayout(uri) ? layoutList.updateLayout(uri, data) : pageList.updatePage(uri, data);
}

/**
 * Make sure we set the proper indices for
 * each list and then setup the sites index
 *
 * @param {Object} sitesService
 * @returns {Promise}
 */
function setup(sitesService) {
  pageList.setPagesIndex();
  layoutList.setLayoutsIndex();
  userList.setUserIndex();
  state.addSitesService(sitesService);

  return sitesList.create(sitesService);
}

setSubscribers(); // runs when the file is required

module.exports = setup;
// For testing
module.exports.handleErrors = handleErrors;
module.exports.handleMetaSave = handleMetaSave;
module.exports.logStatus = logStatus;
module.exports.settleWith = settleWith;
module.exports.setLog = mock => log = mock;
module.exports.setSubscribers = setSubscribers;
module.exports.setInternal = mock => RUN_INTERNAL_PROCESS = mock;
