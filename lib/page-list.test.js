'use strict';

const h = require('highland'),
  _ = require('lodash'),
  expect = require('chai').expect,
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  search = require('./services/elastic'),
  responses = require('./services/responses'),
  helpers = require('./services/elastic-helpers');

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


  describe('findPageByUrlOrUri', function () {
    const fn = lib[this.title];

    it('returns the promise of a query', function () {
      search.query.returns(Promise.resolve());

      return fn('string')
        .then(function () {
          sinon.assert.calledWith(search.query, 'pages', lib.constructFindQuery('string'));
        });
    });
  });

  describe('streamUpdate', function () {
    const fn = lib[this.title];

    it('calles the elastic `update` function', function (done) {
      search.update.returns(Promise.resolve());

      fn({key: 'foo', value: {}})
        .each(function () {
          sinon.assert.calledWith(search.update, 'pages', 'foo', {}, true, true);
        })
        .done(() => done());
    });
  });

  describe('markPagePublished', function () {
    const fn = lib[this.title],
      pageId = 'some.com/pages/foo';

    it('marks an elastic document as published', function (done) {
      search.existsDocument.returns(Promise.resolve(true));
      search.getDocument.returns(Promise.resolve({ _id: pageId, _source: {} }));

      fn({ key: pageId, value: '{"url": "some.com/url"}'})
        .each(function ({ _id, _source }) {
          expect(_id).to.eql(pageId);
          expect(_source.published).to.be.true;
        })
        .done(() => done());
    });
  });

  describe('markScheduled', function () {
    const fn = lib[this.title],
      pageId = 'some.com/pages/foo';

    it('marks an elastic document as published', function (done) {
      search.existsDocument.returns(Promise.resolve(true));
      search.getDocument.returns(Promise.resolve({ _id: pageId, _source: {} }));

      fn({ key: pageId, value: JSON.stringify({at: new Date()})})
        .each(function ({ key, value }) {
          expect(key).to.eql(pageId);
          expect(value.scheduled).to.be.true;
        })
        .done(() => done());
    });
  });

  describe('newPageData', function () {
    it('returns a new page object', function (done) {
      sandbox.stub(lib, 'findSite').returns({slug: 'some'});
      lib.newPageData({key: 'some/page', type: 'put'})
        .each(function (obj) {
          expect(obj.value.uri).to.eql('some/page');
          expect(obj.value.siteSlug).to.eql('some');
        })
        .done(() => done());
    });
  });

  describe('updatePageToPublished', function () {
    it('calls the `updatePageData` function', function (done) {
      sandbox.stub(lib, 'updatePageData').returns(Promise.resolve());

      lib.updatePageToPublished({ _id: 'cool', _source: {} })
        .each(function () {
          sinon.assert.calledWith(lib.updatePageData, 'cool', {});
        })
        .done(() => done());
    });
  });

  describe('successfulUpdate', function () {
    it('logs a success message', function () {
      lib.successfulUpdate({ _id: 'foo' });
      sinon.assert.calledWith(logFn, 'debug', 'Updated page list document foo');
    });
  });

  describe('scheduledOrNew', function () {
    const fn = lib[this.title];

    it('calls `markScheduled` if the page exists', function (done) {
      search.existsDocument.returns(Promise.resolve(true));
      sandbox.stub(lib, 'markScheduled').returns(h.of('cool'));

      fn({ key: 'somePage' })
        .each(function () {
          sinon.assert.calledOnce(lib.markScheduled);
        })
        .done(() => done());
    });

    it('calls `newPageData` if the page exists', function (done) {
      search.existsDocument.returns(Promise.resolve(false));
      sandbox.stub(lib, 'newPageData').returns(h.of('cool'));

      fn({ key: 'somePage' })
        .each(function () {
          sinon.assert.calledOnce(lib.newPageData);
        })
        .done(() => done());
    });
  });
});
