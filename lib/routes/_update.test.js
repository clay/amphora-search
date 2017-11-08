'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  elastic = require('../services/elastic'),
  responses = require('../services/responses'),
  createReq = require('../../test/mocks/req');

function createMockRouter() {
  return {
    use: _.noop,
    all: _.noop,
    get: _.noop,
    put: _.noop,
    post: _.noop,
    delete: _.noop
  };
}

describe(_.startCase(filename), function () {
  let sandbox, router = createMockRouter();

  elastic.setup({
    update: _.noop
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(router);
    sandbox.stub(elastic);
    sandbox.stub(responses);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('routes', function () {
    it('adds an _update route', function () {
      lib(router);
      expect(router.post.calledOnce).to.be.true;
    });
  });

  describe('elasticPassthrough', function () {
    const fn = lib[this.title],
      errMsg = 'An index, id, and body property are all required to update';

    it('queries Elastic', function () {
      var callback = fn({index: 'pages', id: 'id', body: 'body'});

      callback();
      expect(elastic.update.calledWith('pages', 'id', 'body')).to.be.true;
    });

    it('throws an error if there is no index', function () {
      var callback = fn({id: 'id', body: 'body'});

      expect(callback).to.throw(Error);
    });

    it('throws an error if there is no id', function () {
      var callback = fn({index: 'pages', body: 'body'});

      expect(callback).to.throw(Error);
    });

    it('throws an error if there is no body', function () {
      var callback = fn({index: 'pages', id: 'id'});

      expect(callback).to.throw(Error);
    });
  });

  describe('response', function () {
    const fn = lib[this.title];

    it('redirects to login if not authenticated', function () {
      const req = createReq.createReqWithBody({ body: { query: 'query' }}), res = sandbox.stub();

      req.isAuthenticated.returns(false);
      fn(req, res);
      expect(responses.redirectToLogin.calledOnce).to.be.true;
    });

    it('calls the `expectJSON` function', function () {
      const req = createReq.createReqWithBody({ body: { query: 'query' }}), res = sandbox.stub();

      req.isAuthenticated.returns(true);
      fn(req, res);
      expect(responses.expectJSON.calledOnce).to.be.true;
    });
  });
});
