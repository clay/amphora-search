'use strict';

const elastic = require('../services/elastic'),
  helpers = require('../services/elastic-helpers'),
  ElasticsearchScrollStream = require('elasticsearch-scroll-stream'),
  h = require('highland'),
  setup = require('../setup'),
  handlebars = require('handlebars'),
  fs = require('fs'),
  path = require('path'),
  renderEntry = getRenderer('entry'),
  {STANDARD_PRELUDE, NEWS_PRELUDE} = require('../services/sitemaps/preludes'),
  renderNewsEntry = getRenderer('news-entry');

function getRenderer(name) {
  const filename = `${name}.handlebars`,
    filepath = path.join(__dirname, `../services/sitemaps/${filename}`),
    s = fs.readFileSync(filepath, 'utf8');

  return handlebars.compile(s);
}

function routes(router) {
  if (sitemapsEnabled()) {
    router.get('/sitemap.txt', textSitemap);
    router.get('/sitemap.xml', xmlSitemap);

    if (newsSitemapExists()) {
      router.get('/news.xml', newsSitemap);
    }
  }
}

function getEntriesDefault() {
  const index = helpers.indexWithPrefix('pages'),
    client = elastic.getInstance();

  return h(new ElasticsearchScrollStream(client, {
    index,
    type: 'general',
    scroll: '10s',
    size: '50',
    _source: ['publishTime', 'url'],
    body: {
      query: {
        bool: {
          filter: [
            {term: {published: true}}
          ],
          must_not: [
            {term: {url: ''}}
          ]
        }
      },
      sort: [{publishTime: 'desc'}]
    },
  }))
    .map(i => JSON.parse(i.toString()))
    .map(page => ({
      url: page.url,
      lastmod: new Date(page.publishTime).toISOString()
    }));
}

function getEntriesCustom() {
  const index = helpers.indexWithPrefix('sitemap-entries'),
    client = elastic.getInstance();

  return h(new ElasticsearchScrollStream(client, {
    index,
    type: 'general',
    scroll: '10s',
    size: '50'
  }))
    .map(i => JSON.parse(i.toString()));
}

function getNewsEntries() {
  const index = helpers.indexWithPrefix('news-sitemap-entries'),
    client = elastic.getInstance(),
    esStream = new ElasticsearchScrollStream(client, {
      index,
      type: 'general',
      scroll: '10s',
      size: '50',
      sort: [{lastmod: 'desc'}]
    });
  let counter = 0;

  return h(esStream)
    .tap(() => {
      // news sitemap should only include 1,000 entries
      if (counter++ === 1000) esStream.close();
    })
    .map(i => JSON.parse(i.toString()));
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

function textSitemap(req, res) {
  return (customSitemapExists() ? getEntriesCustom() : getEntriesDefault())
    .map(entry => `${entry.url}\n`)
    .tap(res.write.bind(res))
    .done(res.end.bind(res));
}

function xmlSitemap(req, res) {
  res.write(STANDARD_PRELUDE);
  return (customSitemapExists() ? getEntriesCustom() : getEntriesDefault())
    .map(renderEntry)
    .append('</urlset>')
    .tap(res.write.bind(res))
    .done(res.end.bind(res));
}

function newsSitemap(req, res) {
  res.write(NEWS_PRELUDE);
  return getNewsEntries()
    .map(renderNewsEntry)
    .append('</urlset>')
    .tap(res.write.bind(res))
    .done(res.end.bind(res));

}

module.exports = routes;
