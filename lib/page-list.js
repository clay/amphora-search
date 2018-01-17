'use strict';

const _ = require('lodash'),
  h = require('highland'),
  bluebird = require('bluebird'),
  url = require('url'),
  { createOpFilter, isNotPublished } = require('./services/filters'),
  setup = require('./setup'),
  helpers = require('./services/elastic-helpers'),
  elastic = require('./services/elastic'),
  utils = require('clayutils'),
  { subscribe } = require('./streams'),
  PAGE_FILTER = createOpFilter('pages'),
  PARALLEL = 25;
var log = require('./services/log').setup({file: __filename}),
  PAGES_INDEX;

/**
 * Subscribe to the stream of publish operations coming from
 * Amphora and process them to update the page list. Steps:
 *
 * 1. Filter for page operations
 * 2. Get the page list document
 * 3. Mark the appropriate properties to indicate a 'published' state
 * 4. Send the data to Elastic to update
 * 5. Log success (errors caught and logged beforehand)
 */
subscribe('publish')
  .parallel(PARALLEL)
  .filter(PAGE_FILTER)
  .flatMap(markPagePublished)
  .flatMap(streamUpdatePageData)
  .each(successfulUpdate);

/**
 * Subscribe to the stream of save operations coming from
 * Amphora and process them as they come through. Steps:
 *
 * 1. Filter page operations
 * 2. Check if this is a scheduled page instance or new page (only these two come through `save`)
 * 3a. If scheduled, get existing document and mark appropriate fields
 * 3b. If new, create a basic page document and update elastic
 * 4. Log the result. Keep success to debug and errors should be logged.
 */
subscribe('save')
  .parallel(PARALLEL)
  .filter(PAGE_FILTER)
  .filter(isNotPublished)
  .flatMap(scheduledOrNew)
  .flatMap(streamUpdate)
  .each(successfulUpdate);

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
  log('debug', `Updated page list document ${_id}`);
}

/**
 * Return streamed update
 * @param  {String} key
 * @param  {Object} value
 * @return {Stream}
 */
function streamUpdate({ key, value }) { // update the page
  return h(elastic.update(PAGES_INDEX, key, value, true, true));
}

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
    });
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
 * Filter out pages that are neither new nor scheduled
 *
 * @param  {Object} pageOp
 * @return {boolean}
 */
function isScheduledOrNew(pageOp) {
  return function (resp) {
    var isScheduled = pageOp.key.indexOf('@schedule') > -1;

    return isScheduled || !resp;
  };
}

/**
 * Either mark a page as scheduled of make a new document
 *
 * @param  {Object} pageOp
 * @return {Stream}
 */
function scheduledOrNew(pageOp) {
  return existsPage(pageOp)
    .filter(isScheduledOrNew(pageOp))
    .flatMap(function (resp) {
      return resp ? module.exports.markScheduled(pageOp) : module.exports.newPageData(pageOp);
    });
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
 * Given the document, update the data
 * @param  {String} _id
 * @param  {Object} _source
 * @return {Stream}
 */
function streamUpdatePageData({ _id, _source }) {
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
function existsPage({ key }) {
  var baseUri = pageUriFromKey(key);

  return h(
    elastic.existsDocument(PAGES_INDEX, baseUri)
      .then(function (resp) {
        return resp ? baseUri : false;
      })
  );
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
  return elastic.query(PAGES_INDEX, constructFindQuery(urlOrUri));
}

/**
 * Set the sites value during testing
 * @param {Object} sitesObj
 */
function setSites(sitesObj) {
  setup.options.sites = sitesObj;
}

module.exports.updatePageData = updatePageData;
module.exports.updatePageEntry = updatePageEntry;
module.exports.getPage = getPage;
module.exports.findSite = findSite;
module.exports.updatePageListEntry = updatePageListEntry;
module.exports.setPagesIndex = setPagesIndex;
module.exports.findPageByUrlOrUri = findPageByUrlOrUri;

// For testing
module.exports.streamUpdate = streamUpdate;
module.exports.markPagePublished = markPagePublished;
module.exports.newPageData = newPageData;
module.exports.markScheduled = markScheduled;
module.exports.scheduledOrNew = scheduledOrNew;
module.exports.streamUpdatePageData = streamUpdatePageData;
module.exports.successfulUpdate = successfulUpdate;
module.exports.setSites = setSites;
module.exports.parseUpdateUrl = parseUpdateUrl;
module.exports.constructFindQuery = constructFindQuery;
module.exports.setLog = fakeLogger => { log = fakeLogger; };
