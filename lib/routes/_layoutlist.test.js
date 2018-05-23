'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  elastic = require('../services/elastic'),
  layoutListUpdater = require('../layout-list/update'),
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
    sandbox.stub(layoutListUpdater);
    sandbox.stub(responses);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('routes', function () {
    it('adds a route', function () {
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

    it('passes the request body to the layout list', function (done) {
      const req = createReq.createReqWithBody({ body: { uri: 'domain.com/_components/foo/instances/bar', value: { a: 'b' } }});

      req.isAuthenticated.returns(true);
      layoutListUpdater.update.returns(Promise.resolve({ uri: 'domain.com/_components/foo/instances/bar', value: { a: 'c' } }));
      fn(req, {});
      expect(responses.expectJSON.calledOnce).to.equal(true);
      done();
    });
  });
});
