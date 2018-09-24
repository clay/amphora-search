'use strict';

const _ = require('lodash'),
  elastic = require('../services/elastic'),
  { replaceVersion } = require('clayutils'),
  { indexWithPrefix } = require('../services/elastic-helpers');
var log = require('../services/log').setup({ file: __filename }),
  PAGES_INDEX;

/**
 * create or update a page in the pages list
 * @param  {string} uri
 * @param  {object} data
 * @return {object}
 */
function updatePage(uri, data) {
  if (!_.isObject(data)) {
    throw new TypeError('Page data must be an object');
  }

  if (!_.isString(uri)) {
    throw new TypeError('Page uri must be a string');
  }

  return elastic.update(PAGES_INDEX, replaceVersion(uri), data, true, true, process.env.AMPHORA_SEARCH_PAGES_RETRY)
    .then(result => {
      log('debug', `Updated page in pages list: ${result._id}` );
      return result;
    }).catch(error => {
      log('error', error);
      if (error.message && _.includes(error.message, 'strict_dynamic_mapping_exception')) {
        // trying to save properties that aren't mapped
        error.code = 400;
      } else {
        // some other error
        error.code = 500;
      }
      return Promise.reject(error);
    });
}

module.exports.updatePage = updatePage;
module.exports.setPagesIndex = () => PAGES_INDEX = indexWithPrefix('pages');
module.exports.setLog = mock => log = mock;
