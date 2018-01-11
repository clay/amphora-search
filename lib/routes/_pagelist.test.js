'use strict';

const _ = require('lodash'),
  h = require('highland'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  elastic = require('../services/elastic'),
  pageList = require('../page-list'),
  responses = require('../services/responses'),
  createReq = require('../../test/mocks/req'),
  createRes = require('../../test/mocks/resStream');

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
    search: _.noop
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(router);
    sandbox.stub(elastic);
    sandbox.stub(pageList);
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

  describe('response', function () {
    const fn = lib[this.title];

    it('redirects to login if not authenticated', function () {
      const req = createReq.createReqWithBody({ body: { query: 'query' }}), res = sandbox.stub();

      req.isAuthenticated.returns(false);
      fn(req, res);
      expect(responses.redirectToLogin.calledOnce).to.be.true;
    });

    it('passes the request body to the page list', function (done) {
      const req = createReq.createReqWithBody({ body: { query: 'query' }});

      responses.streamOperation.returns(() => {});
      req.isAuthenticated.returns(true);
      fn(req, {});
      sinon.assert.calledOnce(responses.streamOperation);
      done();
    });
  });
});
