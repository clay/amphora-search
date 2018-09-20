'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  router = createMockRouter(),
  elastic = require('../services/elastic'),
  responses = require('../services/responses'),
  createReq = require('../../test/mocks/req');


elastic.setup({
  search: jest.fn()
});

elastic.query = jest.fn();
responses.redirectToLogin = jest.fn();
responses.expectJSON = jest.fn();

function createMockRouter() {
  return {
    use: jest.fn(),
    all: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn()
  };
}

describe(filename, () => {
  describe('routes', () => {
    test('adds a _sites route', () => {
      lib(router);
      expect(router.get).toHaveBeenCalled();
    });
  });

  describe('querySites', () => {
    const fn = lib.querySites;

    test('queries Elastic', () => {
      const response = { hits: {hits: [{ host: 'somesite' }] } };

      elastic.query.mockResolvedValue(response);
      return fn()
        .then(() => expect(elastic.query).toHaveBeenCalledWith('sites', { size: 50 }));
    });

    test('returns just the hits from Elastic ', () => {
      const response = { hits: {hits: [{ host: 'somesite' }] } },
        getResponse = [ { host: 'somesite' } ];

      elastic.query.mockResolvedValue(response);
      return fn()
        .then(resp => expect(resp).toEqual(getResponse));
    });
  });

  describe('response', () => {
    const fn = lib.response;

    test('redirects to login if not authenticated', () => {
      const req = createReq.createReqWithBody({ body: { query: 'query' }}),
        res = jest.fn();

      req.isAuthenticated.mockReturnValue(false);
      fn(req, res);
      expect(responses.redirectToLogin).toHaveBeenCalled();
    });

    test('calls the `expectJSON` function', () => {
      const req = createReq.createReqWithBody({ body: { query: 'query' }}), res = jest.fn();

      req.isAuthenticated.mockReturnValue(true);
      fn(req, res);
      expect(responses.expectJSON).toHaveBeenCalled;
    });
  });
});
