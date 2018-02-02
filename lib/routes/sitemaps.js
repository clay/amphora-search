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
  return sitemaps.fetchEntries(res.locals.site.slug, req.query.year)
    .map(entry => `${entry.url}\n`)
    .tap(res.write.bind(res))
    .done(res.end.bind(res));
}

function xmlSitemap(req, res) {
  res.write(sitemaps.preludes.standard);
  return sitemaps.fetchEntries(res.locals.site.slug, req.query.year)
    .map(sitemaps.renderEntry)
    .append('</urlset>')
    .tap(res.write.bind(res))
    .done(res.end.bind(res));
}

function newsSitemap(req, res) {
  res.write(sitemaps.preludes.news);
  return sitemaps.getNewsEntries(res.locals.site.slug)
    .map(sitemaps.renderNewsEntry)
    .append('</urlset>')
    .tap(res.write.bind(res))
    .done(res.end.bind(res));
}

module.exports = routes;
