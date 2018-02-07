'use strict';

const elastic = require('../elastic'),
  helpers = require('../elastic-helpers'),
  h = require('highland'),
  handlebars = require('handlebars'),
  fs = require('fs'),
  path = require('path'),
  setup = require('../../setup'),
  URLS_PER_PAGE = 50000,
  MAX_NEWS_URLS = 1000;

/**
 * Stream sitemap entries derived from the pages index.
 * @param {string} site site slug
 * @param {number} year
 * @return {Stream} of {url, lastmod} objects
 */
function streamEntriesDefault(site, year) {
  const esStream = elastic.scrollStream({
    index: helpers.indexWithPrefix('pages'),
    type: 'general',
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
      url: page.url,
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
    type: 'general',
    scroll: '10s',
    size: '50',
    sort: [{lastmod: 'desc'}],
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
      }
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
      type: 'general',
      scroll: '10s',
      size: '50',
      body: {
        sort: [{lastmod: 'desc'}],
        query: {bool: {filter: {term: {site}}}}
      }
    });

  return h(esStream)
    .through(closeAtLimit(esStream, MAX_NEWS_URLS))
    .invoke('toString')
    .map(JSON.parse);
}

/**
 * Return a handlebars render fnc for the specified template.
 * @param  {string} name e.g. "foo"
 * @return {function}
 */
function getRenderer(name) {
  const filename = `${name}.handlebars`,
    filepath = path.join(__dirname, filename),
    s = fs.readFileSync(filepath, 'utf8');

  return handlebars.compile(s);
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

module.exports.customSitemapExists = customSitemapExists;
module.exports.newsSitemapExists = newsSitemapExists;
module.exports.preludes = require('./preludes');
module.exports.renderEntry = getRenderer('entry');
module.exports.renderNewsEntry = getRenderer('news-entry');
module.exports.sitemapsEnabled = sitemapsEnabled;
module.exports.streamEntries = streamEntries;
module.exports.streamNewsEntries = streamNewsEntries;
