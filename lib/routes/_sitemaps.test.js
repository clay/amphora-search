'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sitemaps = require('../services/sitemaps'),
  request = require('supertest'),
  h = require('highland'),
  express = require('express');

var app;

beforeEach(() => {
  app = express();
  app.use((req, res, next) => {
    res.locals = {site: {slug: 'foo'}};
    next();
  });

  sitemaps.sitemapsEnabled   = jest.fn();
  sitemaps.streamEntries     = jest.fn();
  sitemaps.renderEntry       = jest.fn();
  sitemaps.newsSitemapExists = jest.fn();
  sitemaps.streamNewsEntries = jest.fn();
});

describe(filename, () => {
  describe ('routes', () => {
    test('renders urls at /sitemap.txt if sitemaps are enabled', () => {
      sitemaps.sitemapsEnabled.mockReturnValue(true);
      sitemaps.streamEntries
        .mockReturnValue(h([{loc: 'a'}, {loc: 'b'}]));
      lib(app);

      return request(app)
        .get('/sitemap.txt')
        .query({year: 2014})
        .expect(200)
        .then(response => {
          expect(response.text).toEqual('a\nb\n');
        });
    });

    test('defaults to current year at /sitemap.txt if year is not specified in query', () => {
      sitemaps.sitemapsEnabled.mockReturnValue(true);
      sitemaps.streamEntries
        .mockReturnValue(h([{loc: 'a'}, {loc: 'b'}]));
      lib(app);

      return request(app)
        .get('/sitemap.txt')
        .expect(200)
        .then(response => {
          expect(response.text).toEqual('a\nb\n');
        });
    });

    test('renders standard xml elements at /sitemap.xml if sitemaps are enabled', () => {
      sitemaps.sitemapsEnabled.mockReturnValue(true);
      sitemaps.streamEntries
        .mockReturnValue(h([{url: 'a'}, {url: 'b'}]));
      sitemaps.renderEntry
        .mockReturnValueOnce('a')
        .mockReturnValueOnce('b');
      lib(app);

      return request(app)
        .get('/sitemap.xml')
        .query({year: 2014})
        .expect(200)
        .then(response => {
          expect(response.text).toEqual(`${sitemaps.preludes.standard}ab</urlset>`);
        });
    });

    test('defaults to current year at /sitemap.xml if year is not specified in query', () => {
      sitemaps.sitemapsEnabled.mockReturnValue(true);
      sitemaps.streamEntries
        .mockReturnValue(h([{url: 'a'}, {url: 'b'}]));
      sitemaps.renderEntry
        .mockReturnValueOnce('a')
        .mockReturnValueOnce('b');
      lib(app);

      return request(app)
        .get('/sitemap.xml')
        .expect(200)
        .then(response => {
          expect(response.text).toEqual(`${sitemaps.preludes.standard}ab</urlset>`);
        });
    });

    test('404s on /sitemap.txt if sitemaps are not enabled', () => {
      sitemaps.sitemapsEnabled.mockReturnValue(false);
      lib(app);

      return request(app)
        .get('/sitemap.txt')
        .expect(404);
    });

    test('404s on /sitemap.xml if sitemaps are not enabled', () => {
      sitemaps.sitemapsEnabled.mockReturnValue(false);

      return request(app)
        .get('/sitemap.xml')
        .expect(404);
    });

    test('shows news xml elements at /news.xml if sitemaps are enabled and news sitemap exists', () => {
      sitemaps.sitemapsEnabled.mockReturnValue(true);
      sitemaps.newsSitemapExists.mockReturnValue(true);
      sitemaps.streamNewsEntries.mockReturnValue(h([1,2]));
      sitemaps.renderEntry
        .mockReturnValueOnce('a')
        .mockReturnValueOnce('b');
      lib(app);

      return request(app)
        .get('/news.xml')
        .expect(200)
        .then(response => {
          expect(response.text).toEqual(`${sitemaps.preludes.news}ab</urlset>`);
        });
    });

    test('404s on /news.xml if sitemaps are not enabled', () => {
      sitemaps.sitemapsEnabled.mockReturnValue(false);
      lib(app);
      return request(app)
        .get('/news.xml')
        .expect(404);
    });

    test('404s on /news.xml if news sitemap does not exist', () => {
      sitemaps.sitemapsEnabled.mockReturnValue(true);
      sitemaps.newsSitemapExists.mockReturnValue(false);
      lib(app);
      return request(app)
        .get('/news.xml')
        .expect(404);
    });

    test('500s on /sitemap.txt if "year" query param cannot be parsed as a number', () => {
      sitemaps.sitemapsEnabled.mockReturnValue(true);
      lib(app);
      return request(app)
        .get('/sitemap.txt')
        .query({year: 'a'})
        .expect(500)
        .then(response => {
          expect(response.text).toEqual('"year" must be a number');
        });
    });

    test('500s on /sitemap.xml if "year" query param cannot be parsed as a number', () => {
      sitemaps.sitemapsEnabled.mockReturnValue(true);
      lib(app);
      return request(app)
        .get('/sitemap.xml')
        .query({year: 'a'})
        .expect(500)
        .then(response => {
          expect(response.text).toEqual('"year" must be a number');
        });
    });
  });
});