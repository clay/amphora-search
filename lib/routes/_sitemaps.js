'use strict';

const sitemaps = require('../services/sitemaps');

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
  return sitemaps.streamEntries(res.locals.site.slug, req.query.year)
    .map(entry => `${entry.url}\n`)
    .pipe(res);
}

function xmlSitemap(req, res) {
  res.write(sitemaps.preludes.standard);
  return sitemaps.streamEntries(res.locals.site.slug, req.query.year)
    .map(sitemaps.renderEntry)
    .append('</urlset>')
    .pipe(res);
}

function newsSitemap(req, res) {
  res.write(sitemaps.preludes.news);
  return sitemaps.streamNewsEntries(res.locals.site.slug)
    .map(sitemaps.renderNewsEntry)
    .append('</urlset>')
    .pipe(res);
}

module.exports = routes;
// for testing
module.exports.textSitemap = textSitemap;
module.exports.xmlSitemap = xmlSitemap;
module.exports.newSitemap = newsSitemap;
