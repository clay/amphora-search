'use strict';

const elastic = require('../services/elastic'),
  helpers = require('../services/elastic-helpers'),
  ElasticsearchScrollStream = require('elasticsearch-scroll-stream'),
  _ = require('lodash'),
  h = require('highland');

function routes(router) {
  router.get('/sitemap.txt', textSitemap);
  router.get('/sitemap.xml', xmlSitemap);
}

function getPublishedPages() {
  const index = helpers.indexWithPrefix('pages'),
    client = elastic.getInstance();

  return h(new ElasticsearchScrollStream(client, {
    index,
    type: 'general',
    scroll: '10s',
    size: '50',
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
    _source: ['publishTime', 'url'],
  }))
    .map(i => JSON.parse(i.toString()));
}

function textSitemap(req, res) {
  return getPublishedPages()
    .tap(page => res.write(`${page.url}\n`))
    .done(() => res.end());
}

function xmlSitemap(req, res) {
  return getPublishedPages()
    .tap(page => {
      const lastmod = new Date(page.publishTime).toISOString();

      res.write(`<url><loc>${page.url}</loc><lastmod>${lastmod}</lastmod></url>`)
    })
    .done(() => res.end());
}

module.exports = routes;
