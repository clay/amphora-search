'use strict';

const elastic = require('./elastic'),
  helpers = require('./elastic-helpers'),
  h = require('highland'),
  setup = require('../setup'),
  xmljs = require('xml-js'),
  _ = require('lodash'),
  URLS_PER_PAGE = 50000,
  MAX_NEWS_URLS = 1000,
  STANDARD_PRELUDE = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
  NEWS_PRELUDE = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">';

/**
 * Stream sitemap entries derived from the pages index.
 * @param {string} site site slug
 * @param {number} year
 * @return {Stream} of {url, lastmod} objects
 */
function streamEntriesDefault(site, year) {
  const esStream = elastic.scrollStream({
    index: helpers.indexWithPrefix('pages'),
    type: '_doc',
    scroll: '10s',
    size: '50',
    _source: ['publishTime', 'url'],
    body: {
      query: {
        bool: {
          filter: [
            {term: {published: true}},
            {term: {siteSlug: site}},
            {range: {
              firstPublishTime: {
                gte: `${year}-01-01`,
                lte: `${year + 1}-01-01`,
                format: 'yyyy-MM-dd'
              }
            }}
          ],
          must_not: [
            {term: {url: ''}}
          ]
        }
      },
      sort: [{publishTime: 'desc'}]
    },
  });

  return h(esStream)
    .through(closeAtLimit(esStream, URLS_PER_PAGE))
    .invoke('toString')
    .map(JSON.parse)
    .map(page => ({
      loc: page.url,
      lastmod: new Date(page.publishTime).toISOString()
    }));
}

function closeAtLimit(esStream, limit) {
  let counter = 0;

  return stream => stream.tap(() => {
    if (counter++ === limit - 1) esStream.close();
  });
}


/**
 * Stream documents from the sitemaps-entries index, sorted by lastmod.
 * @param {string} site site slug
 * @param {number} year
 * @return {Stream}
 */
function streamEntriesCustom(site, year) {
  const esStream = elastic.scrollStream({
    index: helpers.indexWithPrefix('sitemap-entries'),
    type: '_doc',
    scroll: '10s',
    size: '50',
    body: {
      query: {
        bool: {
          filter: [{
            term: {site},
          }, {
            range: {
              lastmod: {
                gte: `${year}-01-01`,
                lte: `${year + 1}-01-01`,
                format: 'yyyy-MM-dd'
              }
            }
          }]
        }
      },
      sort: [{lastmod: 'desc'}]
    }
  });

  return h(esStream)
    .through(closeAtLimit(esStream, URLS_PER_PAGE))
    .invoke('toString')
    .map(JSON.parse);
}

function streamEntries() {
  return customSitemapExists() ?
    streamEntriesCustom.apply(this, arguments) :
    streamEntriesDefault.apply(this, arguments);
}

/**
 * Stream documents from the news-sitemap-entries index, sorted by lastmod.
 * @param {string} [site] site slug
 * @return {Stream}
 */
function streamNewsEntries(site) {
  const index = helpers.indexWithPrefix('news-sitemap-entries'),
    esStream = elastic.scrollStream({
      index,
      type: '_doc',
      scroll: '10s',
      size: '50',
      body: {
        sort: [{
          'news:news.news:publication_date': 'desc'
        }],
        query: {
          bool: {
            filter: [{
              term: {site}
            }, {
              range: {
                'news:news.news:publication_date': {
                  gte : 'now-2d',
                  lt: 'now',
                }
              }
            }]
          }
        }
      }
    });

  return h(esStream)
    .through(closeAtLimit(esStream, MAX_NEWS_URLS))
    .invoke('toString')
    .map(JSON.parse);
}

/**
 * Return true if a mapping and handler for a custom sitemap exists.
 * @return {boolean}
 */
function customSitemapExists() {
  return !!(setup.mappings['sitemap-entries'] &&
    setup.handlers['sitemap-entries']);
}

/**
 * Return true if a mapping and handler for a news sitemap exists.
 * @return {boolean}
 */
function newsSitemapExists() {
  return !!(setup.mappings['news-sitemap-entries'] &&
    setup.handlers['news-sitemap-entries']);
}

/**
 * Return true if amphora-search is configured to mount and render sitemaps.
 * @return {boolean}
 */
function sitemapsEnabled() {
  return setup.options.sitemaps === true;
}

/**
 * Render a sites document
 * @param {Object} doc
 * @return {string}
 */
function renderEntry(doc) {
  return xmljs.js2xml({url: _.omit(doc, ['site'])}, {compact: true});
}

module.exports.preludes = {
  standard: STANDARD_PRELUDE,
  news: NEWS_PRELUDE
};
module.exports.customSitemapExists = customSitemapExists;
module.exports.newsSitemapExists = newsSitemapExists;
module.exports.renderEntry = renderEntry;
module.exports.sitemapsEnabled = sitemapsEnabled;
module.exports.streamEntries = streamEntries;
module.exports.streamNewsEntries = streamNewsEntries;
