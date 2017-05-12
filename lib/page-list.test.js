'use strict';

const _ = require('lodash'),
  expect = require('chai').expect,
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  search = require('./services/elastic'),
  responses = require('./services/responses'),
  helpers = require('./services/elastic-helpers'),
  sampleMapping = {
    component: {
      general: {
        dynamic: 'strict',
        properties: {
          property: {
            type: 'string',
            index: 'not_analyzed'
          }
        }
      }
    }
  },
  sampleBatchOp = [{
    type: 'put',
    key: '//localhost:3001/path/components/component/instances/foo',
    value: '{"value":"bar"}'
  }],
  publishedAndScheduledSampleBatch = [{
    type: 'put',
    key: '//localhost:3001/path/components/component/instances/foo@scheduled',
    value: '{"value":"bar","at": "1483207140000"}'
  }, {
    type: 'put',
    key: '//localhost:3001/path/components/component/instances/foo@published',
    value: '{"value":"bar","url":"http://someurl.com/"}'
  }];

describe(_.startCase(filename), function () {
  let sandbox,
    sites = {
      getSiteFromPrefix: _.noop,
      getSite: _.noop
    };

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(search);
    sandbox.stub(responses);
    sandbox.stub(helpers);
    sandbox.stub(sites);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('filterForPageOps', function () {
    const fn = lib[this.title],
      ops = [{
        type: 'put',
        key: 'host/path/pages/foo'
      }, {
        type: 'put',
        key: 'host/path/components/bar'
      }],
      expected = [{
        type: 'put',
        key: 'host/path/pages/foo'
      }];

    it('filters ops for pages', function () {
      expect(fn(ops)).to.deep.equal(expected);
    });
  });

  describe('getPage', function () {
    const fn = lib[this.title];

    it('calls the `getDocument` function provided by the search service', function () {
      search.getDocument.returns(Promise.resolve({
        _index: 'pages_v1',
        _type: 'general',
        _id: 'localhost/siteName/pages/foo',
        _version: 9,
        found: true,
        _source: {
          uri: 'localhost/siteName/pages/foo',
          published: false,
          scheduled: false,
          scheduledTime: null,
          publishTime: null,
          url: '',
          title: '',
          authors: [],
          siteSlug: 'siteName'
        }
      }));

      return fn('localhost/siteName/pages/foo')
        .then(function (resp) {
          expect(resp._id).to.equal('localhost/siteName/pages/foo');
        });
    });
  });

  describe('pageExists', function () {
    const fn = lib[this.title],
      ops = [{
        key: 'localhost/siteName/pages/foo',
      }, {
        key: 'localhost/siteName/pages/bar'
      }];

    it('calls the `existsDocument` function provided by the search service for each page op', function () {
      search.existsDocument.returns(Promise.resolve(true));

      return fn(ops)
        .then(function (resp) {
          expect(resp).to.deep.equal([true, true]);
        });
    });
  });

  describe('updatePageData', function () {
    const fn = lib[this.title];

    it('throws an error when no data is supplied', function () {
      var result = function () {
        fn();
      };

      expect(result).to.throw(Error);
    });

    it('catches when the update fails', function () {
      search.update.returns(Promise.reject({ stack: 'update failed' }));

      return fn('id', { data: true })
        .then(function (resp) {
          expect(resp).to.deep.equal({ stack: 'update failed' });
        });
    });

    it('updates page data', function () {
      search.update.returns(Promise.resolve({ _id: 'some/page/uri' }));

      return fn('id', { data: true })
        .then(function (resp) {
          expect(resp).to.deep.equal({ _id: 'some/page/uri'});
        });
    });
  });

  describe('updateExistingPageData', function () {
    const fn = lib[this.title];

    it('handles scheduled and published ops', function () {
      sandbox.stub(lib, 'getPage').returns(Promise.resolve({
        _index: 'pages_v1',
        _type: 'general',
        _id: 'localhost/siteName/pages/foo',
        _version: 9,
        found: true,
        _source: {
          uri: 'localhost/siteName/pages/foo',
          published: false,
          scheduled: false,
          scheduledTime: null,
          publishTime: null,
          url: '',
          title: '',
          authors: [],
          siteSlug: 'siteName'
        }
      }));
      sandbox.stub(lib, 'updatePageData').returns(Promise.resolve());

      return fn(publishedAndScheduledSampleBatch)
        .then(function () {
          expect(lib.updatePageData.callCount).to.equal(2);
        });
    });
  });


  describe('updatePageList', function () {
    const fn = lib[this.title];

    it('it does nothing if there are no filtered ops ', function () {
      helpers.applyOpFilters.returns(Promise.resolve([]));

      return fn().then(function () {
        expect(search.batch.calledOnce).to.be.false;
      });
    });

    it('it does nothing if there are not filteredOps', function () {
      var sampleOps = [{
        ops: null,
        mapping: null,
        type: 'general'
      }];

      helpers.applyOpFilters.returns(Promise.resolve([sampleOps]));

      return fn(sampleOps).then(function () {
        expect(search.batch.calledOnce).to.be.false;
      });
    });

    it('it creates a new page in the index if none exists', function () {
      var sampleOps = [{
        ops: sampleBatchOp,
        mapping: sampleMapping,
        type: 'general'
      }];

      sandbox.stub(lib, 'pageExists').returns(Promise.resolve([false]));
      sandbox.stub(lib, 'constructPageData');
      helpers.applyOpFilters.returns(Promise.resolve([sampleOps]));

      return fn(sampleOps).then(function () {
        expect(search.batch.calledOnce).to.be.true;
      });
    });

    it('it creates a new page in the index if none exists', function () {
      var sampleOps = [{
        ops: sampleBatchOp,
        mapping: sampleMapping,
        type: 'general'
      }];

      sandbox.stub(lib, 'pageExists').returns(Promise.resolve([true]));
      sandbox.stub(lib, 'updateExistingPageData');
      helpers.applyOpFilters.returns(Promise.resolve([sampleOps]));

      return fn(sampleOps).then(function () {
        expect(lib.updateExistingPageData.calledOnce).to.be.true;
      });
    });
  });

  describe('constructPageData', function () {
    const fn = lib[this.title];

    it('creates an object containing page data', function () {
      const now = Date.now(),
        sampleOps = [{
          type: 'put',
          key: 'somesite.com/pages/cj1w91ujy00007qmc62l7uez9',
          value: '{"main":["somesite.com/components/article/instances/cj1w91ukl000l7qmcgef3nekm"]}'
        }],
        expectedResult = [{
          type: 'put',
          key: 'somesite.com/pages/cj1w91ujy00007qmc62l7uez9',
          value: {
            createdAt: now,
            uri: 'somesite.com/pages/cj1w91ujy00007qmc62l7uez9',
            published: false,
            scheduled: false,
            scheduledTime: null,
            publishTime: null,
            url: '',
            title: '',
            updateTime: null,
            authors: [],
            siteSlug: 'somesite'
          }
        }];

      sandbox.stub(Date, 'now').returns(now);

      sandbox.stub(lib, 'findSite').returns({
        path: '',
        host: 'somesite.com',
        slug: 'somesite'
      });

      expect(fn(sampleOps)).to.deep.equal(expectedResult);
    });

    it('handles creating page data with @published', function () {
      const now = Date.now(),
        sampleOps = [{
          type: 'put',
          key: 'somesite.com/pages/cj1w91ujy00007qmc62l7uez9@published',
          value: `{"main":["somesite.com/components/article/instances/cj1w91ukl000l7qmcgef3nekm"], "at": "${now}"}`,
        }],
        expectedResult = [{
          type: 'put',
          key: 'somesite.com/pages/cj1w91ujy00007qmc62l7uez9',
          value: {
            createdAt: now,
            uri: 'somesite.com/pages/cj1w91ujy00007qmc62l7uez9',
            published: true,
            scheduled: false,
            scheduledTime: null,
            publishTime: new Date(now),
            url: '',
            title: '',
            updateTime: null,
            authors: [],
            siteSlug: 'somesite'
          }
        }];

      sandbox.stub(Date, 'now').returns(now);

      sandbox.stub(lib, 'findSite').returns({
        path: '',
        host: 'somesite.com',
        slug: 'somesite'
      });

      expect(fn(sampleOps)).to.deep.equal(expectedResult);
    });

    it('handles creating page data with @published', function () {
      const now = Date.now(),
        sampleOps = [{
          type: 'put',
          key: 'somesite.com/pages/cj1w91ujy00007qmc62l7uez9@scheduled',
          value: `{"main":["somesite.com/components/article/instances/cj1w91ukl000l7qmcgef3nekm"], "at": "${now}"}`,
        }],
        expectedResult = [{
          type: 'put',
          key: 'somesite.com/pages/cj1w91ujy00007qmc62l7uez9',
          value: {
            createdAt: now,
            uri: 'somesite.com/pages/cj1w91ujy00007qmc62l7uez9',
            published: false,
            scheduled: true,
            scheduledTime: new Date(now),
            publishTime: null,
            url: '',
            title: '',
            updateTime: null,
            authors: [],
            siteSlug: 'somesite'
          }
        }];

      sandbox.stub(Date, 'now').returns(now);

      sandbox.stub(lib, 'findSite').returns({
        path: '',
        host: 'somesite.com',
        slug: 'somesite'
      });

      expect(fn(sampleOps)).to.deep.equal(expectedResult);
    });
  });

  describe('findSite', function () {
    const fn = lib[this.title];

    it('returns a site from prefix if one is found', function () {
      const siteResp = { host: 'somesite.com' };

      sites.getSiteFromPrefix.returns(siteResp);
      lib.setSites(sites);
      expect(fn()).to.deep.equal(siteResp);
      expect(sites.getSiteFromPrefix.calledOnce).to.be.true;
    });

    it('parses local urls as well', function () {
      const siteResp = { host: 'localhost' };

      sites.getSiteFromPrefix.returns(undefined);
      sites.getSite.returns(siteResp);
      lib.setSites(sites);
      expect(fn('//localhost/somesite/pages/foo')).to.deep.equal(siteResp);
      expect(sites.getSite.calledOnce).to.be.true;
    });

    it('adds the two forward slashes to a local url for parsing', function () {
      const siteResp = { host: 'localhost' };

      sites.getSiteFromPrefix.returns(undefined);
      sites.getSite.returns(siteResp);
      lib.setSites(sites);
      expect(fn('localhost/somesite/pages/foo')).to.deep.equal(siteResp);
    });
  });

  describe('updatePageEntry', function () {
    const fn = lib[this.title];

    it('throws an error if an object is not passed in', function () {
      const objError = () => fn('arg');

      expect(objError).to.throw(Error);
    });

    it('throws an error if no page uri is passed in', function () {
      const uriError = () => fn(undefined, {prop: 'value'});

      expect(uriError).to.throw(Error);
    });

    it('throws an error if a page uri is not a string', function () {
      const uriError = () => fn(2313, {prop: 'value'});

      expect(uriError).to.throw(Error);
    });

    it('truncates the `title` property', function () {
      sandbox.stub(lib, 'updatePageData');
      fn('localhost/site/pages/foo', { title: 'Some super cool title!' });
      expect(lib.updatePageData.calledOnce).to.be.true;
    });

    it('does not try to truncate unless the `title` property is included', function () {
      sandbox.stub(lib, 'updatePageData');
      fn('localhost/site/pages/foo', { authors: ['Cool Author'] });
      expect(lib.updatePageData.calledOnce).to.be.true;
    });
  });

  describe('parseUpdateUrl', function () {
    const fn = lib[this.title];

    it('parses a page uri', function () {
      const testUrl = 'http://sitehost:3001/some/path/pages/foo.html?edit=true';

      expect(fn(testUrl)).to.equal('sitehost/some/path/pages/foo');
    });

    it('does nothing to normal url', function () {
      const testUrl = 'http://sitehost:3001/some/path/2017/03/foo.html?edit=true';

      expect(fn(testUrl)).to.equal('http://sitehost:3001/some/path/2017/03/foo.html');
    });
  });

  describe('constructFindQuery', function () {
    const fn = lib[this.title];

    it('returns a query url', function () {
      const testUrl = 'http://sitehost:3001/some/path/pages/foo.html?edit=true',
        resp = {
          query: {
            multi_match: {
              query: 'sitehost/some/path/pages/foo',
              fields: ['url', '_id']
            }
          }
        };

      expect(fn(testUrl)).to.eql(resp);
    });
  });

  describe('findPageAndUpdate', function () {
    const fn = lib[this.title];

    it('throws an error if there is no `url` property', function () {
      var result = function () {
        fn({});
      };

      expect(result).to.throw(Error);
    });

    // it('womp', function () {
    //   const reqObj = { url: 'http://somehost:3000/pages/foo.html?edit=true', value: { title: 'Page Title'} };
    //
    //   elastic.query.returns(Promise.resolve());
    //   sandbox.stub(lib, 'updatePageListEntry');
    //   return fn(reqObj)
    //     .then(() => {
    //       expect(elastic.query.calledOnce).to.be.true;
    //       expect(lib.updatePageListEntry.calledWith({title: 'Page Title'})).to.be.true;
    //     });
    // });
  });

  describe('updatePageListEntry', function () {
    const fn = lib[this.title];

    it('returns a query url', function () {
      const testObj = { title: 'Some title' },
        callback = fn(testObj),
        resp = {
          hits: {
            hits: [
              {
                _id: 'some/page/uri'
              }
            ]
          }
        };

      sandbox.stub(lib, 'updatePageEntry').returns(Promise.resolve());
      callback(resp);
      expect(lib.updatePageEntry.calledWith('some/page/uri', testObj)).to.be.true;
    });

    it('does nothing if no hits', function () {
      const testObj = { title: 'Some title' },
        callback = fn(testObj),
        resp = {
          hits: {
            hits: []
          }
        };

      sandbox.stub(lib, 'updatePageEntry').returns(Promise.resolve());
      callback(resp);
      expect(lib.updatePageEntry.calledOnce).to.be.false;
    });
  });
});
