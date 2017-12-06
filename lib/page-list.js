'use strict';

const _ = require('lodash'),
  bluebird = require('bluebird'),
  url = require('url'),
  filters = require('./services/filters'),
  setup = require('./setup'),
  helpers = require('./services/elastic-helpers'),
  elastic = require('./services/elastic'),
  utils = require('clay-utils'),
  queue = require('./services/queue');
var log = require('./services/log').setup({file: __filename}),
  PAGES_INDEX;

function setPagesIndex() {
  PAGES_INDEX = helpers.indexWithPrefix('pages');
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
 * Create the data for the page document
 * in the pages list
 *
 * @param  {Array} ops
 * @return {Array}
 */
function constructPageData(ops) {
  return _.map(ops, function (op) {
    var data = JSON.parse(op.value),
      site = module.exports.findSite(op.key),
      published = filters.isPublished(op),
      scheduled = filters.isScheduled(op),
      scheduledTime = scheduled ? new Date(parseInt(data.at, 10)) : null,
      publishTime = published ? new Date(parseInt(data.at, 10)) : null,
      pageUri = pageUriFromKey(op.key);

    return {
      type: op.type,
      key: pageUri,
      value: {
        createdAt: Date.now(),
        uri: pageUri,
        archived: false,
        published: published,
        scheduled: scheduled,
        scheduledTime: scheduledTime,
        publishTime: publishTime,
        updateTime: null,
        url: _.get(data, 'url', ''),
        title: '',
        authors: [],
        siteSlug: site.slug
      }
    };
  });
}

/**
 * Check if the page exists in the page index
 * for the ops passed in. Helps to determine
 * whether or not we should create a new document
 * or update an existing
 *
 * @param  {array} ops
 * @return {Promise}
 */
function pageExists(ops) {
  return bluebird.all(_.map(ops, function (op) {
    return elastic.existsDocument(PAGES_INDEX, 'general', pageUriFromKey(op.key));
  }));
}

/**
 * Update the data of a page if it already exists
 * in the index.
 *
 * @param  {Array} ops
 * @return {Promise}
 */
function updateExistingPageData(ops) {
  return bluebird.all(_.map(ops, function (op) {
    return module.exports.getPage(pageUriFromKey(op.key))
      .then(function (resp) {
        var source = resp._source, // Values currently in Elastic
          data = JSON.parse(_.get(op, 'value')), // Get the op values
          published = filters.isPublished(op), // Are we publishing?
          scheduled = filters.isScheduled(op), // Are we scheduling?
          scheduledTime = scheduled ? new Date(data.at) : null, // If scheudled, when is it scheduled for?
          updateData = {};

        // Update specific properties
        updateData.published = source.published || published;
        updateData.scheduled = scheduled;
        updateData.scheduledTime = scheduledTime;
        updateData.url = data.url ? data.url : source.url;
        updateData.publishTime = published ? new Date() : source.publishTime;

        return module.exports.updatePageData(resp._id, updateData);
      });
  }));
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
 * Handler for batch event. Filter out unwanted ops,
 * construct page data and then send document to ES.
 *
 * @param {Array} batchOps
 * @return {Function}
 */
function updatePageList(batchOps) {
  return helpers.applyOpFilters(batchOps, PAGES_INDEX, filterForPageOps)
    .then(function (filteredOps) {
      if (filteredOps && filteredOps.length) {
        return module.exports.pageExists(filteredOps)
          .then(function (existsArr) {
            var dividedOps = categorizeOps(filteredOps, existsArr);

            if (dividedOps.existing.length) {
              return module.exports.updateExistingPageData(dividedOps.existing);
            } else {
              return elastic.batch(elastic.convertRedisBatchtoElasticBatch(PAGES_INDEX, module.exports.constructPageData(filteredOps)));
            }
          });
      }
    });
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
 * TODO: THIS MAY BE TOO GENERIC. WE MIGHT WANT TO PROTECT CERTAIN PROPERTIES
 * BY CREATING EXPLICIT FUNCTIONS TO UPDATE THEM. OTHERWISE SOMEONE MAY CHANGE
 * DATA TYPES AND THAT WOULD BREAK LIFE
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
 * Find a page document and update values on the document
 * @param  {Object} reqObj
 * @param  {Object} res
 * @returns {Promise}
 */
function findPageAndUpdate(reqObj, res) {
  if (!reqObj.url) {
    let err = new Error('Cannot find page without a url');

    log('error', err.message, { stack: err.stack });
    return bluebird.reject(err);
  }

  return queue.add(function () {
    return elastic.query(PAGES_INDEX, constructFindQuery(reqObj.url))
      .then(module.exports.updatePageListEntry(reqObj.value));
  }).then(function () {
    res.status(200);
    res.json({ status: 'Success' });
  }).catch(function (err) {
    log('error', err.message, { stack: err.stack });
    res.status(400);
    res.json(err);
  });
}

/**
 * Set the sites value during testing
 * @param {Object} sitesObj
 */
function setSites(sitesObj) {
  setup.options.sites = sitesObj;
}

module.exports.updateExistingPageData = updateExistingPageData;
module.exports.updatePageList = updatePageList;
module.exports.updatePageData = updatePageData;
module.exports.filterForPageOps = filterForPageOps;
module.exports.updatePageEntry = updatePageEntry;
module.exports.getPage = getPage;
module.exports.pageExists = pageExists;
module.exports.constructPageData = constructPageData;
module.exports.findSite = findSite;
module.exports.findPageAndUpdate = findPageAndUpdate;
module.exports.updatePageListEntry = updatePageListEntry;
module.exports.setPagesIndex = setPagesIndex;

// For testing
module.exports.setSites = setSites;
module.exports.parseUpdateUrl = parseUpdateUrl;
module.exports.constructFindQuery = constructFindQuery;
module.exports.setLog = fakeLogger => { log = fakeLogger; };
