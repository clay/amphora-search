'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  elastic = require('../services/elastic'),
  responses = require('../services/responses');

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
    sandbox.stub(responses);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('routes', function () {
    it('adds a _sites route', function () {
      lib(router);
      expect(router.get.calledOnce).to.be.true;
    });
  });

  describe('querySites', function () {
    const fn = lib[this.title];

    it('queries Elastic', function () {
      const response = { hits: {hits: [{ host: 'somesite' }] } };

      elastic.query.returns(Promise.resolve(response));
      return fn()
        .then(() => {
          expect(elastic.query.calledWith('sites', { size: 50 }, 'general')).to.be.true;
        });
    });

    it('returns just the hits from Elastic ', function () {
      const response = { hits: {hits: [{ host: 'somesite' }] } },
        getResponse = [ { host: 'somesite' } ];

      elastic.query.returns(Promise.resolve(response));
      return fn()
        .then((resp) => {
          expect(resp).to.deep.equal(getResponse);
        });
    });
  });

  describe('response', function () {
    const fn = lib[this.title];

    it('calls the `expectJSON` function', function () {
      const req = {
          body: {
            query: 'query'
          }
        }, res = sandbox.stub();

      sandbox.stub(elastic.client, 'search');
      fn(req, res);
      expect(responses.expectJSON.calledOnce).to.be.true;
    });
  });
});
