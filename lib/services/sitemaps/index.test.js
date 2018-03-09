'use strict';
/* eslint max-nested-callbacks:[2,5] */

var _ = require('lodash'),
  sinon = require('sinon'),
  expect = require('chai').expect,
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  elastic = require('../elastic'),
  setup = require('../../setup'),
  xml2js = require('xml2js').parseString,
  TestEsStream = require('../../../test/mocks/es-stream');

describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(elastic, 'scrollStream');
  });
  afterEach(function () {
    sandbox.restore();
  });

  describe('customSitemapExists', function () {
    const fn = lib[this.title];

    it ('returns true if a mapping and handler for a custom sitemap index exists', function () {
      setup.mappings['sitemap-entries'] = {};
      setup.handlers['sitemap-entries'] = {};
      expect(fn()).to.be.true;
    });
    it ('returns false if a mapping exists with no handler', function () {
      setup.mappings['sitemap-entries'] = {};
      setup.handlers['sitemap-entries'] = null;
      expect(fn()).to.be.false;
    });
    it ('returns false if a handler exists with no mapping', function () {
      setup.mappings['sitemap-entries'] = null;
      setup.handlers['sitemap-entries'] = {};
      expect(fn()).to.be.false;
    });
    it ('returns false if neither handler nor mapping exists', function () {
      setup.mappings['sitemap-entries'] = null;
      setup.handlers['sitemap-entries'] = null;
      expect(fn()).to.be.false;
    });
  });
  describe('newsSitemapExists', function () {
    const fn = lib[this.title];

    it ('returns true if a mapping and handler for a custom news sitemap index exists', function () {
      setup.mappings['news-sitemap-entries'] = {};
      setup.handlers['news-sitemap-entries'] = {};
      expect(fn()).to.be.true;
    });
    it ('returns false if a mapping exists with no handler', function () {
      setup.mappings['news-sitemap-entries'] = {};
      setup.handlers['news-sitemap-entries'] = null;
      expect(fn()).to.be.false;
    });
    it ('returns false if a handler exists with no mapping', function () {
      setup.mappings['news-sitemap-entries'] = null;
      setup.handlers['news-sitemap-entries'] = {};
      expect(fn()).to.be.false;
    });
    it ('returns false if neither handler nor mapping exists', function () {
      setup.mappings['news-sitemap-entries'] = null;
      setup.handlers['news-sitemap-entries'] = null;
      expect(fn()).to.be.false;
    });
  });
  describe('sitemapsEnabled', function () {
    const fn = lib[this.title];

    it ('returns true if amphoraSearch is configured to handle sitemaps', function () {
      setup.options = { sitemaps: true};
      expect(fn()).to.be.true;
    });
    it ('returns false if amphoraSearch is not configured to handle sitemaps', function () {
      setup.options = { sitemaps: false};
      expect(fn()).to.be.false;
      setup.options = {};
      expect(fn()).to.be.false;
    });
  });

  describe('streamEntries', function () {
    const fn = lib[this.title];

    it ('streams entries by default if custom sitemap does not exist', function () {
      const mockDocs = [{
          url: 'http://foo.com/_pages/1',
          publishTime: '2018-01-01'
        }, {
          url: 'http://foo.com/_pages/2',
          publishTime: '2018-01-01'
        }],
        mockEsStream = new TestEsStream(mockDocs);

      elastic.scrollStream.returns(mockEsStream);
      return fn('wwwthecut', 2018)
        .collect()
        .toPromise(Promise)
        .then(results => {
          expect(results).to.eql([{
            url: 'http://foo.com/_pages/1',
            lastmod: '2018-01-01T00:00:00.000Z'
          }, {
            url: 'http://foo.com/_pages/2',
            lastmod: '2018-01-01T00:00:00.000Z'
          }]);
          expect(elastic.scrollStream.getCall(0).args[0].index).to.equal('pages');
        });
    });

    it ('streams no more than 50,000 entries from default index', function () {
      const mockDocs = _.range(50001)
          .map(() => ({
            url: 'http://foo.com/_pages/1',
            publishTime: '2018-01-01'
          })),
        mockEsStream = new TestEsStream(mockDocs);

      this.timeout(2000);
      elastic.scrollStream.returns(mockEsStream);
      return fn('wwwthecut', 2018)
        .collect()
        .toPromise(Promise)
        .then(results => {
          expect(results.length).to.equal(50000);
        });
    });

    it ('streams only published docs from specified year and site', function () {
      const mockEsStream = new TestEsStream([]);

      elastic.scrollStream.returns(mockEsStream);
      return fn('wwwthecut', 2018)
        .collect()
        .toPromise(Promise)
        .then(() => {
          const query = elastic.scrollStream.getCall(0).args[0].body.query;

          expect(query.bool.filter)
            .to.include({
              term: {siteSlug: 'wwwthecut'}
            });
          expect(query.bool.filter)
            .to.include({
              range: {
                firstPublishTime: {
                  gte: '2018-01-01',
                  lte: '2019-01-01',
                  format: 'yyyy-MM-dd'
                }
              }
            });
          expect(query.bool.filter)
            .to.include({term: {published: true}});
        });
    });

    it ('streams entries from sitemaps-entries index if custom sitemap does exist', function () {
      const mockDocs = [{
          url: 'http://foo.com/_pages/1',
          lastmod: '2018-01-01T00:00:00.000Z'
        }, {
          url: 'http://foo.com/_pages/2',
          publishTime: '2018-01-01T00:00:00.000Z'
        }],
        mockEsStream = new TestEsStream(mockDocs);

      setup.mappings = sandbox.stub();
      setup.mappings['sitemap-entries'] = true;
      setup.handlers['sitemap-entries'] = true;
      elastic.scrollStream.returns(mockEsStream);
      return fn('wwwthecut', 2018)
        .collect()
        .toPromise(Promise)
        .then(results => {
          expect(results).to.eql(mockDocs);
          expect(elastic.scrollStream.getCall(0).args[0].index).to.equal('sitemap-entries');
        });
    });

    it ('streams no more than 50,000 entries from custom sitemap index', function () {
      const mockDocs = _.range(50001)
          .map(() => ({
            url: 'http://foo.com/_pages/1',
            publishTime: '2018-01-01'
          })),
        mockEsStream = new TestEsStream(mockDocs);

      this.timeout(2000);
      setup.mappings = sandbox.stub();
      setup.mappings['sitemap-entries'] = true;
      setup.handlers['sitemap-entries'] = true;
      elastic.scrollStream.returns(mockEsStream);
      return fn('wwwthecut', 2018)
        .collect()
        .toPromise(Promise)
        .then(results => {
          expect(results.length).to.equal(50000);
        });
    });

    it ('streams only custom entries from specified year and site', function () {
      setup.mappings = sandbox.stub();
      setup.mappings['sitemap-entries'] = true;
      setup.handlers['sitemap-entries'] = true;
      elastic.scrollStream.returns(new TestEsStream([]));
      return fn('wwwthecut', 2018)
        .collect()
        .toPromise(Promise)
        .then(() => {
          const query = elastic.scrollStream.getCall(0).args[0].body.query;

          expect(query.bool.filter)
            .to.include({
              term: {site: 'wwwthecut'}
            });
          expect(query.bool.filter)
            .to.include({
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

  describe('streamNewsEntries', function () {
    const fn = lib[this.title];

    it ('streams documents from news-sitemaps-entries', function () {
      const mockDocs = [{foo: 'bar'}, {bar: 'baz'}],
        mockEsStream = new TestEsStream(mockDocs);

      elastic.scrollStream.returns(mockEsStream);
      return fn('wwwthecut')
        .collect()
        .toPromise(Promise)
        .then(results => {
          const elasticOpts = elastic.scrollStream.getCall(0).args[0];

          expect(results).to.eql(mockDocs);
          expect(elasticOpts.index).to.equal('news-sitemap-entries');
          expect(elasticOpts.body.sort).to.include({
            lastmod: 'desc'
          });
          expect(elasticOpts.body.query.bool.filter).to.include(
            {term: {site: 'wwwthecut'}}
          );
          expect(elasticOpts.body.query.bool.filter).to.include({
            range: {
              publication_date: {
                gte : 'now-2d',
                lt: 'now',
              }
            }
          });
        });
    });

    it ('streams no more than 1,000 docs', function () {
      const mockDocs = _.range(1000).map(() => ({foo: 'bar'})),
        mockEsStream = new TestEsStream(mockDocs);

      elastic.scrollStream.returns(mockEsStream);
      return fn('wwwthecut')
        .collect()
        .toPromise(Promise)
        .then(results => {
          expect(results.length).to.equal(1000);
        });
    });
  });

  describe('renderEntry', function () {
    const fn = lib[this.title];

    it ('renders all expected props of a sitemap', function (done) {
      const rendered = fn({
          url: 'a',
          lastmod: 'b',
          changefreq: 'c',
          priority: 'd',
          images: [
            {location: 'e', caption: 'f'}
          ]
        }),
        expectedXml = {
          url: {
            loc: ['a'],
            lastmod: ['b'],
            changefreq: ['c'],
            priority: ['d'],
            'image:image': [{
              'image:loc': ['e'],
              'image:caption': ['f']
            }]
          }
        };

      xml2js(rendered, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.eql(expectedXml);
        done();
      });
    });
  });

  describe('renderNewsEntry', function () {
    const fn = lib[this.title];

    it ('renders all expected props of a news sitemap', function (done) {
      const rendered = fn({
          url: 'a',
          lastmod: 'b',
          publication: {
            name: 'c',
            language: 'd'
          },
          publication_date: 'e',
          title: 'f',
          language: 'g',
          keywords: ['h','i','j'],
          stock_tickers: ['k','l','m'],
          genres: ['n','o','p']
        }),
        expectedXml = {
          url: {
            loc: ['a'],
            lastmod: ['b'],
            'news:news': [{
              'news:publication': [{
                'news:name': ['c'],
                'news:language': ['d']
              }],
              'news:publication_date': ['e'],
              'news:title': ['f'],
              'news:language': ['g'],
              'news:keywords': ['h, i, j'],
              'news:stock_tickers': ['k, l, m'],
              'news:genres': ['n, o, p']
            }]
          }
        };

      xml2js(rendered, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.eql(expectedXml);
        done();
      });
    });
  });
});
