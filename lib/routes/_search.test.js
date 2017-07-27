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
    search: _.noop,
    msearch: _.noop
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
    it('adds a _search route', function () {
      lib(router);
      expect(router.post.calledOnce).to.be.true;
    });
  });

  describe('elasticPassthrough', function () {
    const fn = lib[this.title];

    it('queries Elastic', function () {
      var callback = fn({index: 'pages', query: 'query'});

      sandbox.stub(elastic.client, 'search');
      callback();
      expect(elastic.client.search.calledWith({index: 'pages', query: 'query'})).to.be.true;
    });

    it('throws an error if there is no index', function () {
      var callback = fn({query: 'query'});

      expect(callback).to.throw(Error);
    });

    it('uses msearch when body is an array', function () {
      var callback = fn({index: 'pages', body: [{query: 'query'}]});

      sandbox.stub(elastic.client, 'msearch');
      callback();
      expect(elastic.client.msearch.called).to.be.true;
    });

    it('uses search when body is an object', function () {
      var callback = fn({index: 'pages', body: {query: 'query'}});

      sandbox.stub(elastic.client, 'search');
      callback();
      expect(elastic.client.search.called).to.be.true;
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
      sandbox.stub(elastic.client, 'search');
      fn(req, res);
      expect(responses.expectJSON.calledOnce).to.be.true;
    });
  });
});
