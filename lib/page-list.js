'use strict';

const _ = require('lodash'),
  h = require('highland'),
  bluebird = require('bluebird'),
  url = require('url'),
  filters = require('./services/filters'),
  setup = require('./setup'),
  helpers = require('./services/elastic-helpers'),
  elastic = require('./services/elastic'),
  utils = require('clayutils'),
  { subscribe, saveStream } = require('./streams');
var log = require('./services/log').setup({file: __filename}),
  PAGES_INDEX;

/**
 * Assign the pages index var
 */
function setPagesIndex() {
  PAGES_INDEX = helpers.indexWithPrefix('pages');
}

/**
 * Log a page list successful update
 * @param  {String} _id
 */
function successfulUpdate({ _id }) {
  log('debug', `Updated page list document ${id}`);
}

// The Publish Stream
subscribe('publish')
  .parallel(1)
  .filter(filters.isPageOp)
  .filter(filters.isPutOp)
  .flatMap(markPagePublished)
  .flatMap(updatePageToPublished)
  .each(successfulUpdate)

// The Save Stream
subscribe('save')
  .parallel(1)
  .filter(filters.isPageOp)
  .filter(filters.isPutOp)
  .flatMap(scheduledOrNew)
  .flatMap(function ({ key, value }) { // update the page
    return h(elastic.update(PAGES_INDEX, key, value, true, true));
  })
  .each(successfulUpdate)

/**
 * Set the document to a published status
 *
 * @param  {Object} page
 * @return {Stream}
 */
function markPagePublished(page) {
  var { url, customUrl } = JSON.parse(page.value);

  return existsPage(page)
    .flatMap(getPageById)
    .map(function ({ _id, _source }) {
      _source.published = true;
      _source.publishTime = new Date();
      _source.url = customUrl || url;

      return { _id, _source };
    })
}

/**
 * Update properties for a scheduled page
 *
 * @param  {String} key
 * @param  {Value} value
 * @return {Stream}
 */
function markScheduled({ key, value }) {
  var { at } = JSON.parse(value);

  return getPageById(pageUriFromKey(key))
    .map(function ({ _source, _id }) {
      _source.scheduled = true;
      _source.scheduledTime = toUTC(at);

      return { value: _source, key: _id };
    });
}

/**
 * Either mark a page as scheduled of make a new document
 *
 * @param  {Object} pageOp
 * @return {Stream}
 */
function scheduledOrNew(pageOp) {
  return existsPage(pageOp)
    .flatMap(function (resp) {
      return resp ? markScheduled(pageOp) : newPageData(pageOp);
    })
}

/**
 * Make a date UTC
 *
 * @param  {Date} date
 * @return {String}
 */
function toUTC(date) {
  return new Date(date).toISOString();
}

/**
 * Given a page operation, make a new document
 *
 * @param  {String} key
 * @param  {String} type
 * @return {Object}
 */
function newPageData({ key, type }) {
  var { slug } = module.exports.findSite(key);

  return h.of({
    type: type,
    key,
    value: {
      createdAt: Date.now(),
      uri: key,
      archived: false,
      published: false,
      scheduled: false,
      scheduledTime: null,
      publishTime: null,
      updateTime: null,
      url: '',
      title: '',
      authors: [],
      siteSlug: slug
    }
  });
}

/**
 * [updatePageToPublished description]
 * @param  {[type]} _id     [description]
 * @param  {[type]} _source [description]
 * @return {[type]}         [description]
 */
function updatePageToPublished({ _id, _source }) {
  return h(module.exports.updatePageData(_id, _source));
}

/**
 * Given an id for a document, retrieve it
 *
 * @param  {String} id
 * @return {Stream}
 */
function getPageById(id) {
  return h(module.exports.getPage(id));
}

/**
 * Check if a page exists when given a page operation
 *
 * @param  {String} key
 * @return {Stream}
 */
function existsPage({ key, value }) {
  var baseUri = pageUriFromKey(key);

  return h(
    elastic.existsDocument(PAGES_INDEX, baseUri)
      .then(function (resp) {
        return resp ? baseUri : false;
      })
  );
}

/**
 * Filter out ops that aren't `pages` and `puts`
 * @param  {Array} ops
 * @return {Array}
 */
function filterForPageOps(ops) {
  ops = _.filter(ops, filters.isPageOp);
  return ops = _.filter(ops, filters.isPutOp);
}

/**
 * Categorize ops into whether or not they are
 * for existing pages or are for new pages.
 *
 * @param  {Array} ops
 * @param  {Array} existing
 * @return {Promise}
 */
function categorizeOps(ops, existing) {
  var pairings = {
    existing: [],
    new: []
  };

  _.each(existing, function (value, index) {
    value ? pairings.existing.push(ops[index]) : pairings.new.push(ops[index]);
  });

  return pairings;
}

/**
 * Grab the page uri from the key. We don't care
 * if the page uri is published or not.
 *
 * @param  {String} key
 * @return {String}
 */
function pageUriFromKey(key) {
  return key.split('@')[0];
}

/**
 * Find the proper site object using the sites service.
 *
 * @param  {String} key
 * @return {Object}
 */
function findSite(key) {
  var site = setup.options.sites.getSiteFromPrefix(key),
    parsedUrl;

  // If the site is not found from the prefix we need to
  // use the `host` value to find it.
  if (!site) {
    // Make sure it's prefixed with `//` so it can get parsed properly
    // (Usually a problem when working locally)
    key = _.includes(key, '//') ? key : `//${key}`;
    parsedUrl = url.parse(key, true, true);
    site = setup.options.sites.getSite(parsedUrl.host, '');
  }

  return site;
}

/**
 * Update the data of a page. Data passed in should
 * be an object whose properties match with existing
 * properties of the document
 *
 * @param  {String} pageUri
 * @param  {Object} data
 * @return {Promise}
 */
function updatePageData(pageUri, data) {
  if (!data) {
    let err = new Error('Updating a page requires a data object');

    log('error', err.message, { stack: err.stack, dataArg: data });
    return bluebird.reject(err);
  }

  return elastic.update(PAGES_INDEX, pageUri, data, true)
    .then(function (result) {
      log('debug', `Page data updates for page: ${result._id}` );
      return result;
    }).catch(function (error) {
      log('error', error);
      return error;
    });
}

/**
 * Get a document's data from the pages index
 *
 * @param  {String} pageUri
 * @return {Promise}
 */
function getPage(pageUri) {
  return elastic.getDocument(PAGES_INDEX, pageUri);
}

/**
 * TODO: THIS SHOULD PROBABLY BE IN A UTILS FILE...
 * @param  {String} title
 * @return {String}
 */
function truncateTitle(title) {
  return _.truncate(title, {
    length: 75
  });
}

/**
 * Update a property on a page list document
 *
 * @param  {String} pageUri
 * @param  {Object} updateObj
 * @return {Promise}
 */
function updatePageEntry(pageUri, updateObj) {
  var err;

  if (!_.isObject(updateObj)) {
    err = new Error('An object with properties to update is required to update the page list');
  } else if (!pageUri || !_.isString(pageUri)) {
    err = new TypeError(`Expected pageUri {String}, but got: ${pageUri}`);
  }

  if (err) {
    log('error', err.message, { stack: err.stack, pageUri });
    return bluebird.reject(err);
  }

  // Let's truncate the title string to only be 75 characters + '...'
  if (_.get(updateObj, 'title', undefined)) {
    _.set(updateObj, 'titleTruncated', truncateTitle(updateObj.title));
  }

  return module.exports.updatePageData(pageUri, updateObj);
};

/**
 * Convert a url into the format we expect in a page document
 * @param  {String} string
 * @return {String}
 */
function parseUpdateUrl(string) {
  const parsedUrl = url.parse(string, true, true);

  return utils.isPage(string) ? string.split('.html')[0].replace(`${parsedUrl.protocol}//`, '').replace(`:${parsedUrl.port}`, '') : string.split('?')[0];
}

/**
 * Return the query to find a page by a url passed in
 * @param  {String} updateUrl
 * @return {Object}
 */
function constructFindQuery(updateUrl) {
  return {
    query: {
      multi_match: {
        query: parseUpdateUrl(updateUrl),
        fields: ['url', '_id']
      }
    }
  };
}

/**
 * If results were found, update the page entry
 * @param  {Object} value
 * @return {Promise}
 */
function updatePageListEntry(value) {
  return function (resp) {
    var hit = _.get(resp, 'hits.hits[0]', undefined);

    if (hit) {
      return module.exports.updatePageEntry(hit._id, value);
    }
  };
}

/**
 * Grab the page document by url or uri
 *
 * @param  {String} urlOrUri
 * @return {Promise}
 */
function findPageByUrlOrUri(urlOrUri) {
  return elastic.query(PAGES_INDEX, constructFindQuery(urlOrUri))
}

/**
 * Set the sites value during testing
 * @param {Object} sitesObj
 */
function setSites(sitesObj) {
  setup.options.sites = sitesObj;
}

module.exports.updatePageData = updatePageData;
module.exports.filterForPageOps = filterForPageOps;
module.exports.updatePageEntry = updatePageEntry;
module.exports.getPage = getPage;
module.exports.findSite = findSite;
module.exports.updatePageListEntry = updatePageListEntry;
module.exports.setPagesIndex = setPagesIndex;
module.exports.findPageByUrlOrUri = findPageByUrlOrUri;

// For testing
module.exports.setSites = setSites;
module.exports.parseUpdateUrl = parseUpdateUrl;
module.exports.constructFindQuery = constructFindQuery;
module.exports.setLog = fakeLogger => { log = fakeLogger; };
