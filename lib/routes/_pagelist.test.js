'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  elastic = require('../services/elastic'),
  pageListUpdater = require('../page-list/update'),
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
    search: _.noop
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(router);
    sandbox.stub(elastic);
    sandbox.stub(pageListUpdater);
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
      const req = createReq.createReqWithBody({ body: { url: 'domain.com/pages/foo', value: { a: 'b' } }});

      req.isAuthenticated.returns(true);
      pageListUpdater.update.returns(Promise.resolve({ a: 'b' }));
      fn(req, {});
      expect(responses.expectJSON.calledOnce).to.equal(true);
      done();
    });
  });
});
