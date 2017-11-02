'use strict';

const _ = require('lodash'),
  bluebird = require('bluebird'),
  url = require('url'),
  log = require('./services/log').setup({file: __filename}),
  filters = require('./services/filters'),
  setup = require('./setup'),
  helpers = require('./services/elastic-helpers'),
  elastic = require('./services/elastic'),
  sites = require('./services/sites'),
  utils = require('clayutils'),
  queue = require('./services/queue');

var PAGES_INDEX;

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
 * Create the data for the page document
 * in the pages list
 *
 * @param  {Array} ops
 * @return {Array}
 */
function constructPageData(ops) {
  return _.map(ops, function (op) {
    var data = JSON.parse(op.value),
      siteSlug = op.key.split('/').shift(),
      published = filters.isPublished(op),
      scheduled = filters.isScheduled(op),
      scheduledTime = scheduled ? new Date(parseInt(data.at, 10)) : null,
      publishTime = published ? new Date(parseInt(data.at, 10)) : null,
      pageUri = pageUriFromKey(op.key),
      site = sites.getSiteBySlug(pageUri);

    return {
      type: op.type,
      key: pageUri,
      value: {
        createdAt: Date.now(),
        uri: utils.uriSlugToPrefix(pageUri, site),
        published: published,
        scheduled: scheduled,
        scheduledTime: scheduledTime,
        publishTime: publishTime,
        updateTime: null,
        url: _.get(data, 'url', ''),
        title: '',
        authors: [],
        siteSlug
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
    throw new Error('Updating a page requires a data object');
  }

  return elastic.update(PAGES_INDEX, 'general', pageUri, data, true)
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
  return elastic.getDocument(PAGES_INDEX, 'general', pageUri);
}


/**
 * Handler for batch event. Filter out unwanted ops,
 * construct page data and then send document to ES.
 *
 * @param {Array} batchOps
 * @return {Function}
 */
function updatePageList(batchOps) {
  return helpers.applyOpFilters(batchOps, setup.mappings, PAGES_INDEX, filterForPageOps)
    .then(function (resp) {
      var resp = _.get(resp, '[0][0]'),
        filteredOps,
        typeName;

      if (resp) {
        filteredOps = resp.ops;
        typeName = resp.typeName;

        if (filteredOps) {
          return module.exports.pageExists(filteredOps)
            .then(function (existsArr) {
              var dividedOps = categorizeOps(filteredOps, existsArr);

              if (dividedOps.existing.length) {
                return module.exports.updateExistingPageData(dividedOps.existing);
              } else {
                return elastic.batch(elastic.convertRedisBatchtoElasticBatch(PAGES_INDEX, typeName, module.exports.constructPageData(filteredOps)));
              }
            });
        }
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
  if (!_.isObject(updateObj)) {
    throw new Error('An object with properties to update is required to update the page list');
  } else if (!pageUri || !_.isString(pageUri)) {
    throw new Error('Expected pageUri {String}, but got: ', pageUri);
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
        fields: ['url', 'uri']
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
    throw new Error('Cannot find page without a url');
  }

  return queue.add(function () {
    return elastic.query(PAGES_INDEX, constructFindQuery(reqObj.url), 'general')
      .then(module.exports.updatePageListEntry(reqObj.value));
  }).then(function () {
    res.status(200);
    res.json({ status: 'Success' });
  }).catch(function (err) {
    // TODO: Improve this handling. Make more generic.
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
module.exports.findPageAndUpdate = findPageAndUpdate;
module.exports.updatePageListEntry = updatePageListEntry;
module.exports.setPagesIndex = setPagesIndex;

// For testing
module.exports.setSites = setSites;
module.exports.parseUpdateUrl = parseUpdateUrl;
module.exports.constructFindQuery = constructFindQuery;
