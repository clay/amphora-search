'use strict';

const elastic = require('../elastic'),
  helpers = require('../elastic-helpers'),
  ElasticsearchScrollStream = require('elasticsearch-scroll-stream'),
  h = require('highland'),
  handlebars = require('handlebars'),
  fs = require('fs'),
  path = require('path'),
  setup = require('../../setup'),
  URLS_PER_PAGE = 1,
  MAX_NEWS_URLS = 50000;

/**
 * Stream sitemap entry data for out-of-the-box rendering of standard
 * sitemap from data from the pages index.
 * @param {string} site site slug
 * @param {number} [from=0] skip n docs
 * @return {Stream} of {url, lastmod} objects
 */
function getEntriesDefault(site, from = 0) {
  console.log('get entries default', site, from);
  const index = helpers.indexWithPrefix('pages'),
    client = elastic.getInstance(),
    esStream = new ElasticsearchScrollStream(client, {
      index,
      type: 'general',
      scroll: '10s',
      size: '50',
      _source: ['publishTime', 'url'],
      from,
      body: {
        query: {
          bool: {
            filter: [
              {term: {published: true}},
              {term: {siteSlug: site}}
            ],
            must_not: [
              {term: {url: ''}}
            ]
          }
        },
        sort: [{publishTime: 'desc'}]
      },
    });
  let counter = 0;

  return h(esStream)
    .tap(() => {
      if (counter++ === URLS_PER_PAGE) esStream.close();
    })
    .map(i => JSON.parse(i.toString()))
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
 * @param {number} [from=0] skip n docs
 * @return {Stream}
 */
function getEntriesCustom(site, from = 0) {
  const index = helpers.indexWithPrefix('sitemap-entries'),
    client = elastic.getInstance(),
    esStream = new ElasticsearchScrollStream(client, {
      index,
      type: 'general',
      scroll: '10s',
      size: '50',
      sort: [{lastmod: 'desc'}],
      body: {
        query: {bool: {filter: {term: {site}}}},
        from
      }
    });
  let counter = 0;

  return h(esStream)
    .tap(() => {
      if (counter++ === URLS_PER_PAGE) esStream.close();
    })
    .map(i => JSON.parse(i.toString()));
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
    .map(i => JSON.parse(i.toString()));
}

function getRenderer(name) {
  const filename = `${name}.handlebars`,
    filepath = path.join(__dirname, filename),
    s = fs.readFileSync(filepath, 'utf8');

  return handlebars.compile(s);
}

function customSitemapExists() {
  return !!setup.mappings['sitemap-entries'] &&
    !!setup.handlers['sitemap-entries'];
}

function newsSitemapExists() {
  return !!(setup.mappings['news-sitemap-entries'] &&
    setup.handlers['news-sitemap-entries']);
}

function sitemapsEnabled() {
  return setup.options.sitemaps === true;
}

module.exports.customSitemapExists = customSitemapExists;
module.exports.newsSitemapExists = newsSitemapExists;
module.exports.sitemapsEnabled = sitemapsEnabled;
module.exports.getNewsEntries = getNewsEntries;
module.exports.fetchEntries = fetchEntries;
module.exports.URLS_PER_PAGE = URLS_PER_PAGE;
module.exports.render = {
  index: getRenderer('sitemap-index'),
  entry: getRenderer('entry'),
  newsEntry: getRenderer('news-entry')
},
module.exports.preludes = require('./preludes');
