'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  expect = require('chai').expect,
  elastic = require('../services/elastic'),
  uri = 'domain.com/_components/abc/instances/def';

describe(`Layout List: ${_.startCase(filename)}:`, function () {
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

  describe('hasLayout', function () {
    const fn = lib[this.title];

    it('returns true if layout exists', function () {
      elastic.existsDocument.returns(true);
      expect(fn(uri)).to.equal(true);
    });

    it('returns false if layout does not exist', function () {
      elastic.existsDocument.returns(false);
      expect(fn(uri)).to.equal(false);
    });
  });

  describe('getLayout', function () {
    const fn = lib[this.title];

    it('resolves layout if it exists', function () {
      const layout = { _source: { createdAt: 1 }};

      elastic.getDocument.returns(Promise.resolve(layout));
      return fn(uri).then(function (result) {
        expect(result).to.eql({ createdAt: 1 });
      });
    });

    it('rejects if layout does not exist', function (done) {
      elastic.getDocument.returns(Promise.reject());
      fn(uri).catch(done());
    });
  });

  describe('updateLayout', function () {
    const fn = lib[this.title];

    it('throws error if first arg is not string', function () {
      expect(() => fn(null, {})).to.throw('Layout uri must be a string');
    });

    it('throws error if second arg is not object', function () {
      expect(() => fn('')).to.throw('Layout data must be an object');
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

  describe('getSite', function () {
    const fn = lib[this.title];

    it('returns site slug if found', function () {
      elastic.query.returns(Promise.resolve({ hits: { hits: [{ _source: { slug: 'siteslug' }}]}}));
      return fn(uri).then(function (result) {
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
});
