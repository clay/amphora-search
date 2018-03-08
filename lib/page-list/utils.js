'use strict';
const url = require('url'),
  _ = require('lodash'),
  clayutils = require('clayutils'),
  helpers = require('../services/elastic-helpers'),
  elastic = require('../services/elastic');

let log = require('../services/log').setup({ file: __filename }),
  PAGES_INDEX, SITES_INDEX;

/* istanbul ignore next */
/**
 * Assign the pages index
 */
function setPagesIndex() {
  PAGES_INDEX = helpers.indexWithPrefix('pages');
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
 * determine if a page exists in the pages index
 * @param  {string}  uri
 * @return {Boolean}
 */
function hasPage(uri) {
  return elastic.existsDocument(clayutils.replaceVersion(uri));
}

/**
 * get elastic entry for a page
 * @param {string} uri
 * @return {object}
 */
function getPage(uri) {
  return elastic.getDocument(PAGES_INDEX, clayutils.replaceVersion(uri)).then(function (response) {
    return _.get(response, '_source');
  });
}

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

  // truncate the title to 75 characters
  if (data.title) {
    data.titleTruncated = _.truncate(data.title, { length: 75 });
  }

  return elastic.update(PAGES_INDEX, clayutils.replaceVersion(uri), data, true, true)
    .then(function (result) {
      log('debug', `Updated page in pages list: ${result._id}` );
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
 * Convert a url into the format we expect in a page document
 * note: if isPage() is true, it might be a page uri OR preview url
 * (in which case, remove the extension and protocol/port)
 * @param  {String} uriOrUrl
 * @return {String}
 */
function parseUpdateUrl(uriOrUrl) {
  const parsed = url.parse(uriOrUrl, true, true);

  return clayutils.isPage(uriOrUrl) ? uriOrUrl.split('.html')[0].replace(`${parsed.protocol}//`, '').replace(`:${parsed.port}`, '') : uriOrUrl.split('?')[0];
}

/**
 * build a query that finds a page by uri (_id in elastic) or url
 * @param  {string} uriOrUrl
 * @return {object}
 */
function buildQuery(uriOrUrl) {
  return {
    query: {
      multi_match: {
        query: parseUpdateUrl(uriOrUrl),
        fields: ['url', '_id']
      }
    }
  };
}

/**
 * query for a page in the pages index
 * @param  {string} uriOrUrl
 * @return {object}
 */
function findPage(uriOrUrl) {
  return elastic.query(PAGES_INDEX, buildQuery(uriOrUrl)).then(function (response) {
    return _.get(response, 'hits.hits[0]._source');
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
 * get the site slug from a page uri
 * @param  {string} uri
 * @return {Promise}
 */
function getSite(uri) {
  const prefix = uri.substring(0, uri.indexOf('/_pages'));

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

/**
 * pass through the user (from req.user) if it's a person,
 * or return a user object for api keys
 * @param  {object} [user]
 * @return {object}
 */
function userOrRobot(user) {
  if (user && _.get(user, 'username') && _.get(user, 'provider')) {
    return user;
  } else {
    // no actual user, this was an api key
    return {
      username: 'robot',
      provider: 'clay',
      imageUrl: '',
      name: 'Clay',
      auth: 'admin'
    };
  }
}

module.exports.setPagesIndex = setPagesIndex; // called on plugin init()
module.exports.setSitesIndex = setSitesIndex; // called on plugin init()
module.exports.hasPage = hasPage;
module.exports.getPage = getPage;
module.exports.updatePage = updatePage;
module.exports.findPage = findPage;
module.exports.getSite = getSite;
module.exports.utcDate = utcDate;
module.exports.userOrRobot = userOrRobot;
module.exports.setLog = (fakeLogger) => { log = fakeLogger; };
