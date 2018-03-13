'use strict';

const sitemaps = require('../services/sitemaps'),
  _ = require('lodash');

function routes(router) {
  if (sitemaps.sitemapsEnabled()) {
    router.get('/sitemap.txt', textSitemap);
    router.get('/sitemap.xml', xmlSitemap);
    if (sitemaps.newsSitemapExists()) {
      router.get('/news.xml', newsSitemap);
    }
  }
}

function textSitemap(req, res) {
  const year = req.query.year ?
    parseInt(req.query.year, 10) :
    new Date().getFullYear();

  if (!_.isFinite(year)) {
    return res.status(500).send('"year" must be a number');
  }

  return sitemaps.streamEntries(res.locals.site.slug, year)
    .map(entry => `${entry.loc}\n`)
    .pipe(res);
}

function xmlSitemap(req, res) {
  const year = req.query.year ?
    parseInt(req.query.year, 10) :
    new Date().getFullYear();

  if (!_.isFinite(year)) {
    return res.status(500).send('"year" must be a number');
  }

  res.write(sitemaps.preludes.standard);
  return sitemaps.streamEntries(res.locals.site.slug, year)
    .map(sitemaps.renderEntry)
    .append('</urlset>')
    .pipe(res);
}

function newsSitemap(req, res) {
  res.write(sitemaps.preludes.news);
  return sitemaps.streamNewsEntries(res.locals.site.slug)
    .map(sitemaps.renderEntry)
    .append('</urlset>')
    .pipe(res);
}

module.exports = routes;
// for testing
module.exports.textSitemap = textSitemap;
module.exports.xmlSitemap = xmlSitemap;
module.exports.newSitemap = newsSitemap;
