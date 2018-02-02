'use strict';

const elastic = require('../elastic'),
  helpers = require('../elastic-helpers'),
  ElasticsearchScrollStream = require('elasticsearch-scroll-stream'),
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
function getEntriesDefault(site, year) {
  const index = helpers.indexWithPrefix('pages'),
    client = elastic.getInstance(),
    targetYear = year || new Date().getFullYear(),
    opts = {
      index,
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
                  gte: `${targetYear}-01-01`,
                  lte: `${targetYear + 1}-01-01`,
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
    },
    esStream = new ElasticsearchScrollStream(client, opts);
  let counter = 0;

  return h(esStream)
    .tap(() => {
      if (counter++ === URLS_PER_PAGE) esStream.close();
    })
    .slice(0, URLS_PER_PAGE)
    .invoke('toString')
    .map(JSON.parse)
    .map(page => ({
      url: page.url,
      lastmod: new Date(page.publishTime).toISOString()
    }))
    .stopOnError(err => {
      console.log(err, err.stack);
    });
}

/**
 * Stream documents from the sitemaps-entries index, sorted by lastmod.
 * @param {string} [site] site slug
 * @param {number} [year]
 * @return {Stream}
 */
function getEntriesCustom(site, year) {
  const index = helpers.indexWithPrefix('sitemap-entries'),
    client = elastic.getInstance(),
    targetYear = year || new Date().getFullYear(),
    esStream = new ElasticsearchScrollStream(client, {
      index,
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
                  gte: `${targetYear}-01-01`,
                  lte: `${targetYear + 1}-01-01`,
                  format: 'yyyy-MM-dd'
                }
              }
            }]
          }
        }
      }
    });
  let counter = 0;

  return h(esStream)
    .tap(() => {
      if (counter++ === URLS_PER_PAGE) esStream.close();
    })
    .slice(0, URLS_PER_PAGE)
    .invoke('toString')
    .map(JSON.parse);
}

function fetchEntries() {
  return customSitemapExists() ?
    getEntriesCustom.apply(this, arguments) :
    getEntriesDefault.apply(this, arguments);
}

/**
 * Stream documents from the news-sitemap-entries index, sorted by lastmod.
 * @param {string} [site] site slug
 * @return {Stream}
 */
function getNewsEntries(site) {
  const index = helpers.indexWithPrefix('news-sitemap-entries'),
    client = elastic.getInstance(),
    esStream = new ElasticsearchScrollStream(client, {
      index,
      type: 'general',
      scroll: '10s',
      size: '50',
      body: {
        sort: [{lastmod: 'desc'}],
        query: {bool: {filter: {term: {site}}}}
      }
    });
  let counter = 0;

  return h(esStream)
    .tap(() => {
      // news sitemap should only include 1,000 entries
      if (counter++ === MAX_NEWS_URLS) esStream.close();
    })
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
module.exports.sitemapsEnabled = sitemapsEnabled;
module.exports.getNewsEntries = getNewsEntries;
module.exports.fetchEntries = fetchEntries;
module.exports.render = {
  entry: getRenderer('entry'),
  newsEntry: getRenderer('news-entry')
},
module.exports.preludes = require('./preludes');
