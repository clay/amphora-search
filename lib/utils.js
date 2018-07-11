'use strict';

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

  return elastic.update(LAYOUTS_INDEX, clayutils.replaceVersion(uri), data, true, true)
    .then(function (result) {
      log('debug', `Updated layout in layouts list: ${result._id}` );
      return result;
    }).catch(function (error) {
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
