'use strict';

const _ = require('lodash'),
  bluebird = require('bluebird'),
  url = require('url'),
  log = require('./services/log').withStandardPrefix(__dirname), // TODO: Use passed in logger?
  filters = require('./services/filters'),
  setup = require('./setup'),
  helpers = require('./services/elastic-helpers'),
  elastic = require('./services/elastic'),
  PREFIX = process.env.ELASTIC_PREFIX ? `${process.env.ELASTIC_PREFIX}-` : '', // TODO: Move all this into one file. We shouldn't need to determine this in every file
  PAGES_INDEX = `${PREFIX}pages`,
  SITES_INDEX = `${PREFIX}sites`;

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
  var pairings = { existing: [], new: [] };

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
 * Create the data about the page.
 *
 * @param  {Object} mapping
 * @param  {Array} ops
 * @return {Array}
 */
function constructPageData(mapping, ops) {
  return _.map(ops, function (op) {
    var data = JSON.parse(op.value),
      site = findSite(op.key),
      published = filters.isPublished(op),
      scheduled = filters.isScheduled(op),
      scheduledTime = scheduled ? new Date(data.at) : null,
      publishTime = published ? new Date() : null;

    return {
      type: op.type,
      key: pageUriFromKey(op.key),
      value: {
        uri: `${site.host}${site.path}${op.key.split(site.path)[1]}`,
        published: published,
        scheduled: scheduled,
        scheduledTime: scheduledTime,
        publishTime: publishTime,
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
    return getPage(pageUriFromKey(op.key)) // TODO: Was 'module.exports'
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

        return updatePageData(resp._id, updateData); // TODO: Was `module.exports`
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

  return elastic.update(PAGES_INDEX, 'general', pageUri, data)
    .then(function (result) {
      log('info', 'Page data updates for page:', result._id);
      return result;
    }).catch(function (error) {
      log('error', error.stack);
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
      var resp = resp[0][0],
        filteredOps = resp.ops,
        mapping = resp.mapping,
        typeName = resp.typeName;

      if (filteredOps.length) {
        return pageExists(filteredOps) // TODO: THIS WAS `module.exports`. For testing?
          .then(function (existsArr) {
            var dividedOps = categorizeOps(filteredOps, existsArr);

            if (dividedOps.existing.length) {
              return updateExistingPageData(dividedOps.existing); // TODO: WAS `module.exports`
            } else {
              return elastic.batch(elastic.convertRedisBatchtoElasticBatch(PAGES_INDEX, typeName, constructPageData(mapping, filteredOps)));
            }
          });
      }
    });
}

module.exports.updatePageList = updatePageList;
module.exports.filterForPageOps = filterForPageOps;
