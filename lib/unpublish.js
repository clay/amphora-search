'use strict';

const pageList = require('./page-list');
var log = require('./services/log').withStandardPrefix(__dirname);

/**
 * Reset values when a page is unpublished
 *
 * @param  {Object} payload
 * @return {Promise}
 */
function unpublish({ uri }) {
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

function setLog(customLog) {
  log = customLog;
}

module.exports = unpublish;
module.exports.setLog = setLog; // For testing
