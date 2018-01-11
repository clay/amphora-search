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
  let sandbox, logFn,
    sites = {
      getSiteFromPrefix: _.noop,
      getSite: _.noop
    };

  function assertLoggedError(errMsg) {
    return function (err) {
      sinon.assert.calledWith(logFn, 'error', errMsg);
      expect(err.message).to.equal(errMsg);
    };
  }

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    logFn = sandbox.stub();
    sandbox.stub(search);
    sandbox.stub(responses);
    sandbox.stub(helpers);
    sandbox.stub(sites);
    lib.setLog(logFn);
  });

  afterEach(function () {
    sandbox.restore();
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


  describe('updatePageData', function () {
    const fn = lib[this.title];

    it('logs an error when no data is supplied', function () {
      const errMsg = 'Updating a page requires a data object';

      return fn().catch(assertLoggedError(errMsg));
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

    it('logs an error if an object is not passed in', function () {
      const errMsg = 'An object with properties to update is required to update the page list';

      fn('arg').catch(assertLoggedError(errMsg));
    });

    it('logs an error if no page uri is passed in', function () {
      const errMsg = 'Expected pageUri {String}, but got: undefined';

      fn(undefined, {prop: 'value'}).catch(assertLoggedError(errMsg));
    });

    it('logs an error if a page uri is not a string', function () {
      const errMsg = 'Expected pageUri {String}, but got: 2313';

      fn(2313, {prop: 'value'}).catch(assertLoggedError(errMsg));
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
