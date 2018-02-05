'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  expect = require('chai').expect,
  elastic = require('../services/elastic'),
  uri = 'domain.com/pages/abc',
  uriWithUnderscore = 'domain.com/_pages/abc';

describe(`Page List: ${_.startCase(filename)}:`, function () {
  let sandbox, logFn;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    logFn = sandbox.stub();

    sandbox.stub(elastic);
    lib.setLog(logFn);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('hasPage', function () {
    const fn = lib[this.title];

    it('returns true if page exists', function () {
      elastic.existsDocument.returns(true);
      expect(fn(uri)).to.equal(true);
    });

    it('returns false if page does not exist', function () {
      elastic.existsDocument.returns(false);
      expect(fn(uri)).to.equal(false);
    });
  });

  describe('getPage', function () {
    const fn = lib[this.title];

    it('resolves page if it exists', function () {
      const page = { _source: { createdAt: 1 }};

      elastic.getDocument.returns(Promise.resolve(page));
      return fn(uri).then(function (result) {
        expect(result).to.eql({ createdAt: 1 });
      });
    });

    it('rejects if page does not exist', function (done) {
      elastic.getDocument.returns(Promise.reject());
      fn(uri).catch(done());
    });
  });

  describe('updatePage', function () {
    const fn = lib[this.title];

    it('throws error if first arg is not string', function () {
      expect(() => fn(null, {})).to.throw('Page uri must be a string');
    });

    it('throws error if second arg is not object', function () {
      expect(() => fn('')).to.throw('Page data must be an object');
    });

    it('truncates title if it exists', function () {
      elastic.update.returns(Promise.resolve({ _id: uri }));
      return fn(uri, { title: 'hi' }).then(function () {
        expect(elastic.update.getCall(0).args[2]).to.eql({ title: 'hi', titleTruncated: 'hi' });
      });
    });

    it('does not truncate title if it does not exist', function () {
      elastic.update.returns(Promise.resolve({ _id: uri }));
      return fn(uri, { a: 'b' }).then(function () {
        expect(elastic.update.getCall(0).args[2]).to.eql({ a: 'b' });
      });
    });

    it('replaces uri version when updating elastic', function () {
      elastic.update.returns(Promise.resolve({ _id: uri }));
      return fn(`${uri}@published`, { a: 'b' }).then(function () {
        expect(elastic.update.getCall(0).args[1]).to.eql(uri);
      });
    });

    it('logs error if elastic update fails', function () {
      elastic.update.returns(Promise.reject(new Error('nope')));
      return fn(uri, {}).catch(function () {
        expect(logFn.calledWith('error')).to.equal(true);
      });
    });

    it('logs client error if elastic update fails with strict mapping exception', function () {
      elastic.update.returns(Promise.reject(new Error('strict_dynamic_mapping_exception: foo is bad')));
      return fn(uri, {}).catch(function () {
        expect(logFn.calledWith('error')).to.equal(true);
      });
    });
  });

  describe('findPage', function () {
    const fn = lib[this.title];

    it('returns page source if found', function () {
      elastic.query.returns(Promise.resolve({ hits: { hits: [{ _source: { a: 'b' }}]}}));
      return fn(uri).then(function (result) {
        expect(result).to.eql({ a: 'b' });
      });
    });

    it('handles page html url', function () {
      elastic.query.returns(Promise.resolve({ hits: { hits: [{ _source: { a: 'b' }}]}}));
      return fn('http://domain.com:3001/pages/abc.html').then(function (result) {
        expect(result).to.eql({ a: 'b' });
      });
    });

    it('handles public url + edit mode', function () {
      elastic.query.returns(Promise.resolve({ hits: { hits: [{ _source: { a: 'b' }}]}}));
      return fn('http://domain.com/some-place.html?edit=true').then(function (result) {
        expect(result).to.eql({ a: 'b' });
      });
    });
  });

  describe('getSite', function () {
    const fn = lib[this.title];

    it('returns site slug if found', function () {
      elastic.query.returns(Promise.resolve({ hits: { hits: [{ _source: { slug: 'siteslug' }}]}}));
      return fn(uri).then(function (result) {
        expect(result).to.equal('siteslug');
      });
    });

    it('handles underscored uris', function () {
      elastic.query.returns(Promise.resolve({ hits: { hits: [{ _source: { slug: 'siteslug' }}]}}));
      return fn(uriWithUnderscore).then(function (result) {
        expect(result).to.equal('siteslug');
      });
    });
  });

  describe('utcDate', function () {
    const fn = lib[this.title];

    it('returns utc date', function () {
      expect(fn(new Date(0))).to.equal('1970-01-01T00:00:00.000Z');
    });
  });

  describe('userOrRobot', function () {
    const fn = lib[this.title];

    it('returns user if they exist', function () {
      const user = { username: 'bob', provider: 'twitter' };

      expect(fn(user)).to.eql(user);
    });

    it('returns robot if user does not exist', function () {
      const user = { username: 'bob' };

      expect(fn(user).username).to.equal('robot');
    });
  });
});
