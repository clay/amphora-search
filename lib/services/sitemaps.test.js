'use strict';


var _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  elastic = require('./elastic'),
  setup = require('../setup'),
  xmljs = require('xml-js'),
  TestEsStream = require('../../test/mocks/es-stream');


beforeEach(() => {
  elastic.scrollStream = jest.fn();
});

describe(filename, () => {
  describe('customSitemapExists', () => {
    const fn = lib.customSitemapExists;

    test('returns true if a mapping and handler for a custom sitemap index exists', () => {
      setup.mappings['sitemap-entries'] = {};
      setup.handlers['sitemap-entries'] = {};
      expect(fn()).toBeTruthy();
    });

    test('returns false if a mapping exists with no handler', () => {
      setup.mappings['sitemap-entries'] = {};
      setup.handlers['sitemap-entries'] = null;
      expect(fn()).toBeFalsy();
    });
    test('returns false if a handler exists with no mapping', () => {
      setup.mappings['sitemap-entries'] = null;
      setup.handlers['sitemap-entries'] = {};
      expect(fn()).toBeFalsy();
    });
    test('returns false if neither handler nor mapping exists', () => {
      setup.mappings['sitemap-entries'] = null;
      setup.handlers['sitemap-entries'] = null;
      expect(fn()).toBeFalsy();
    });
  });

  describe('newsSitemapExists', () => {
    const fn = lib.newsSitemapExists;

    test('returns true if a mapping and handler for a custom news sitemap index exists', () => {
      setup.mappings['news-sitemap-entries'] = {};
      setup.handlers['news-sitemap-entries'] = {};
      expect(fn()).toBeTruthy();
    });
    test('returns false if a mapping exists with no handler', () => {
      setup.mappings['news-sitemap-entries'] = {};
      setup.handlers['news-sitemap-entries'] = null;
      expect(fn()).toBeFalsy();
    });
    test('returns false if a handler exists with no mapping', () => {
      setup.mappings['news-sitemap-entries'] = null;
      setup.handlers['news-sitemap-entries'] = {};
      expect(fn()).toBeFalsy();
    });
    test('returns false if neither handler nor mapping exists', () => {
      setup.mappings['news-sitemap-entries'] = null;
      setup.handlers['news-sitemap-entries'] = null;
      expect(fn()).toBeFalsy();
    });
  });

  describe('sitemapsEnabled', () => {
    const fn = lib.sitemapsEnabled;

    test('returns true if amphoraSearch is configured to handle sitemaps', () => {
      setup.options = { sitemaps: true};
      expect(fn()).toBeTruthy();
    });

    test('returns false if amphoraSearch is not configured to handle sitemaps', () => {
      setup.options = { sitemaps: false};
      expect(fn()).toBeFalsy();
      setup.options = {};
      expect(fn()).toBeFalsy();
    });
  });

  describe('streamEntries', () => {
    const fn = lib.streamEntries;

    test('streams entries by default if custom sitemap does not exist', () => {
      const mockDocs = [{
          url: 'http://foo.com/_pages/1',
          publishTime: '2018-01-01'
        }, {
          url: 'http://foo.com/_pages/2',
          publishTime: '2018-01-01'
        }],
        mockEsStream = new TestEsStream(mockDocs);

      elastic.scrollStream.mockReturnValue(mockEsStream);
      return fn('wwwthecut', 2018)
        .collect()
        .toPromise(Promise)
        .then(results => {
          expect(results).toEqual([{
            loc: 'http://foo.com/_pages/1',
            lastmod: '2018-01-01T00:00:00.000Z'
          }, {
            loc: 'http://foo.com/_pages/2',
            lastmod: '2018-01-01T00:00:00.000Z'
          }]);
          expect(elastic.scrollStream.mock.calls[0][0].index).toBe('pages');
        });
    });

    test('streams no more than 50,000 entries from default index', () => {
      const mockDocs = _.range(50001)
          .map(() => ({
            url: 'http://foo.com/_pages/1',
            publishTime: '2018-01-01'
          })),
        mockEsStream = new TestEsStream(mockDocs);

      elastic.scrollStream.mockReturnValue(mockEsStream);
      return fn('wwwthecut', 2018)
        .collect()
        .toPromise(Promise)
        .then(results => {
          expect(results.length).toBe(50000);
        });
    });

    test('streams only published docs from specified year and site', () => {
      const mockEsStream = new TestEsStream([]);

      elastic.scrollStream.mockReturnValue(mockEsStream);
      return fn('wwwthecut', 2018)
        .collect()
        .toPromise(Promise)
        .then(() => {
          console.log('!!!', typeof elastic.scrollStream.mock.calls);
          const query = elastic.scrollStream.mock.calls[0][0].body.query;

          expect(query.bool.filter)
            .toContainEqual({
              term: {siteSlug: 'wwwthecut'}
            });
          expect(query.bool.filter)
            .toContainEqual({
              range: {
                firstPublishTime: {
                  gte: '2018-01-01',
                  lte: '2019-01-01',
                  format: 'yyyy-MM-dd'
                }
              }
            });
          expect(query.bool.filter)
            .toContainEqual({term: {published: true}});
        });
    });

    test('streams entries from sitemaps-entries index if custom sitemap does exist', () => {
      const mockDocs = [{
          url: 'http://foo.com/_pages/1',
          lastmod: '2018-01-01T00:00:00.000Z'
        }, {
          url: 'http://foo.com/_pages/2',
          publishTime: '2018-01-01T00:00:00.000Z'
        }],
        mockEsStream = new TestEsStream(mockDocs);

      setup.mappings = jest.fn();
      setup.mappings['sitemap-entries'] = true;
      setup.handlers['sitemap-entries'] = true;
      elastic.scrollStream.mockReturnValue(mockEsStream);
      return fn('wwwthecut', 2018)
        .collect()
        .toPromise(Promise)
        .then(results => {
          expect(results).toEqual(mockDocs);
          expect(elastic.scrollStream.mock.calls[0][0].index).toBe('sitemap-entries');
        });
    });

    test('streams no more than 50,000 entries from custom sitemap index', () => {
      const mockDocs = _.range(50001)
          .map(() => ({
            url: 'http://foo.com/_pages/1',
            publishTime: '2018-01-01'
          })),
        mockEsStream = new TestEsStream(mockDocs);


      setup.mappings = jest.fn();
      setup.mappings['sitemap-entries'] = true;
      setup.handlers['sitemap-entries'] = true;
      elastic.scrollStream.mockReturnValue(mockEsStream);
      return fn('wwwthecut', 2018)
        .collect()
        .toPromise(Promise)
        .then(results => {
          expect(results.length).toBe(50000);
        });
    });

    test('streams only custom entries from specified year and site', () => {
      setup.mappings = jest.fn();
      setup.mappings['sitemap-entries'] = true;
      setup.handlers['sitemap-entries'] = true;
      elastic.scrollStream.mockReturnValue(new TestEsStream([]));

      return fn('wwwthecut', 2018)
        .collect()
        .toPromise(Promise)
        .then(() => {
          const query = elastic.scrollStream.mock.calls[0][0].body.query;

          expect(query.bool.filter)
            .toContainEqual({ term: {site: 'wwwthecut'} });
          expect(query.bool.filter)
            .toContainEqual({
              range: {
                lastmod: {
                  gte: '2018-01-01',
                  lte: '2019-01-01',
                  format: 'yyyy-MM-dd'
                }
              }
            });
        });
    });
  });

  describe('streamNewsEntries', () => {
    const fn = lib.streamNewsEntries;

    test('streams documents from news-sitemaps-entries', () => {
      const mockDocs = [{foo: 'bar'}, {bar: 'baz'}],
        mockEsStream = new TestEsStream(mockDocs);

      elastic.scrollStream.mockReturnValue(mockEsStream);
      return fn('wwwthecut')
        .collect()
        .toPromise(Promise)
        .then(results => {
          const elasticOpts = elastic.scrollStream.mock.calls[0][0];

          expect(results).toEqual(mockDocs);
          expect(elasticOpts.index).toEqual('news-sitemap-entries');
          expect(elasticOpts.body.sort).toContainEqual({
            'news:news.news:publication_date': 'desc'
          });
          expect(elasticOpts.body.query.bool.filter).toContainEqual(
            {term: {site: 'wwwthecut'}}
          );
          expect(elasticOpts.body.query.bool.filter).toContainEqual({
            range: {
              'news:news.news:publication_date': {
                gte : 'now-2d',
                lt: 'now',
              }
            }
          });
        });
    });

    test('streams no more than 1,000 docs', () => {
      const mockDocs = _.range(1000).map(() => ({foo: 'bar'})),
        mockEsStream = new TestEsStream(mockDocs);

      elastic.scrollStream.mockReturnValue(mockEsStream);
      return fn('wwwthecut')
        .collect()
        .toPromise(Promise)
        .then(results => {
          expect(results.length).toBe(1000);
        });
    });
  });

  describe('renderEntry', () => {
    const fn = lib.renderEntry;

    test('renders all props of specified doc, excluding "site" prop', () => {
      const doc = {
          loc: 'a',
          lastmod: 'b',
          changefreq: 'c',
          priority: 'd',
          'image:image': [{'image:loc': 'e', 'image:caption': 'f'}],
          site: 'foo'
        },
        expectedOut = {
          url: {
            loc: {_text: 'a'},
            lastmod: {_text: 'b'},
            changefreq: {_text: 'c'},
            priority: {_text: 'd'},
            'image:image': {
              'image:loc': {_text: 'e'},
              'image:caption': {_text: 'f'}
            }
          }
        },
        rendered = fn(doc);

      expect(xmljs.xml2js(rendered, {compact: true})).toEqual(expectedOut);
    });
  });
});
