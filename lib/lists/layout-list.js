'use strict';

const _ = require('lodash'),
  elastic = require('../services/elastic'),
  { replaceVersion } = require('clayutils'),
  { indexWithPrefix } = require('../services/elastic-helpers');
var log = require('../services/log').setup({ file: __filename }),
  LAYOUTS_INDEX;

/**
 * create or update a layout in the layouts list
 * @param  {string} uri
 * @param  {object} data
 * @return {object}
 */
function updateLayout(uri, data) {
  if (!_.isObject(data)) {
    throw new TypeError('Layout data must be an object');
  }

  if (!_.isString(uri)) {
    throw new TypeError('Layout uri must be a string');
  }

  return elastic.update(LAYOUTS_INDEX, replaceVersion(uri), data, true, true)
    .then(result => {
      log('debug', `Updated layout in layouts list: ${result._id}` );
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



module.exports.setLayoutsIndex = () => LAYOUTS_INDEX = indexWithPrefix('layouts');
module.exports.updateLayout = updateLayout;

// For testing
module.exports.setLog = mock => log = mock;
