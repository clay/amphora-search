'use strict';
const url = require('url'),
  _ = require('lodash'),
  clayutils = require('clayutils'),
  helpers = require('../services/elastic-helpers'),
  elastic = require('../services/elastic');

let log = require('../services/log').setup({ file: __filename }),
  LAYOUTS_INDEX, SITES_INDEX;

/* istanbul ignore next */
/**
 * Assign the layouts index
 */
function setLayoutsIndex() {
  LAYOUTS_INDEX = helpers.indexWithPrefix('layouts');
}

/* istanbul ignore next */
/**
 * Assign the sites index
 * @param {string} index
 */
function setSitesIndex(index) {
  SITES_INDEX = index;
}

/**
 * determine if a layout exists in the layouts index
 * @param  {string}  uri
 * @return {Boolean}
 */
function hasLayout(uri) {
  return elastic.existsDocument(clayutils.replaceVersion(uri));
}

/**
 * get elastic entry for a layout
 * @param {string} uri
 * @return {object}
 */
function getLayout(uri) {
  return elastic.getDocument(LAYOUTS_INDEX, clayutils.replaceVersion(uri)).then(function (response) {
    return _.get(response, '_source');
  });
}

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

/**
 * build a query that finds a site from the page uri's prefix
 * @param  {string} prefix
 * @return {object}
 */
function buildSiteQuery(prefix) {
  const parsed = url.parse(`http://${prefix}`);

  return {
    query: {
      bool: {
        must: [{
          term: { host: parsed.hostname }
        }, {
          term: { path: parsed.pathname === '/' ? '' : parsed.pathname } // root paths are saved in the sites index as emptystring
        }]
      }
    }
  };
}

/**
 * get the site slug from a layout uri
 * @param  {string} uri
 * @return {Promise}
 */
function getSite(uri) {
  const prefix = uri.substring(0, uri.indexOf('/_components'));

  return elastic.query(SITES_INDEX, buildSiteQuery(prefix))
    .then(function (response) {
      return _.get(response, 'hits.hits[0]._source.slug');
    });
}

/**
 * create a UTC date, or convert an existing date to UTC
 * @param  {Date} [date]
 * @return {String}
 */
function utcDate(date) {
  return date ? new Date(date).toISOString() : /* istanbul ignore next */ (new Date()).toISOString();
}

module.exports.setLayoutsIndex = setLayoutsIndex; // called on plugin init()
module.exports.setSitesIndex = setSitesIndex; // called on plugin init()
module.exports.hasLayout = hasLayout;
module.exports.getLayout = getLayout;
module.exports.updateLayout = updateLayout;
module.exports.getSite = getSite;
module.exports.utcDate = utcDate;
module.exports.setLog = (fakeLogger) => { log = fakeLogger; };
