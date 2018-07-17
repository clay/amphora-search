'use strict';

const h = require('highland'),
  { isLayout } = require('clayutils'),
  { subscribe } = require('../streams'),
  pageList = require('./page-list'),
  layoutList = require('./layout-list'),
  userList = require('./user-list'),
  sitesList = require('./sites-list');
var log = require('../services/log').setup({ file: __filename });

// For meta updates
subscribe('saveMeta')
  .map(handleMetaSave)
  .merge()
  .each(logStatus);

// For adding to users index
subscribe('saveUser')
  .flatMap(userList.updateUserList)
  .each(logStatus);

// For removing from users index
subscribe('deleteUser')
  .flatMap(userList.removeUser)
  .each(logStatus);

/**
 * Log the result of the update
 *
 * @param {Object} resp
 */
function logStatus(resp) {
  if (resp instanceof Error) {
    log('error', resp.message);
    return;
  }

  log('debug', `Document ${resp.result}`, { _id: resp._id });
}

/**
 *
 * @param {Object} payload
 * @param {String} payload.uri
 * @param {Object} payload.data
 * @returns {Stream}
 */
function handleMetaSave({ uri, data }) {
  const promise = isLayout(uri) ? layoutList.updateLayout(uri, data) : pageList.updatePage(uri, data);

  return h(promise);
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

  return sitesList(sitesService);
}

module.exports = setup;