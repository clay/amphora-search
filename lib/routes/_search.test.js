'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  router = createMockRouter(),
  elastic = require('../services/elastic'),
  responses = require('../services/responses'),
  createReq = require('../../test/mocks/req');

responses.expectJSON = jest.fn();
responses.redirectToLogin = jest.fn();
elastic.setup({
  search: jest.fn(),
  msearch: jest.fn()
});

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
    it('adds a _search route', () => {
      lib(router);
      expect(router.post).toHaveBeenCalled();
    });
  });

  describe('elasticPassthrough', () => {
    const fn = lib.elasticPassthrough;

    test('queries Elastic', () => {
      var callback = fn({index: 'pages', query: 'query'});

      callback();
      expect(elastic.client.search.mock.calls[0][0])
        .toEqual({index: 'pages', query: 'query', type: '_doc'});
    });

    test('throws an error if there is no index', () => {
      var callback = fn({query: 'query'});

      expect(callback).toThrow(Error);
    });

    test('uses msearch when body is an array', () => {
      var callback = fn({index: 'pages', body: [{query: 'query'}]});

      callback();
      expect(elastic.client.msearch).toHaveBeenCalled();
    });

    test('uses search when body is an object', () => {
      var callback = fn({index: 'pages', body: {query: 'query'}});

      callback();
      expect(elastic.client.search).toHaveBeenCalled();
    });
  });

  describe('response', () => {
    const fn = lib.response;

    it('redirects to login if not authenticated', () => {
      const req = createReq.createReqWithBody({ body: { query: 'query' }}), res = jest.fn;

      req.isAuthenticated.mockReturnValue(false);
      fn(req, res);
      expect(responses.redirectToLogin).toHaveBeenCalled();
    });

    it('calls the `expectJSON` function', () => {
      const req = createReq.createReqWithBody({ body: { query: 'query' }}), res = jest.fn;

      req.isAuthenticated.mockReturnValue(true);
      fn(req, res);
      expect(responses.expectJSON).toHaveBeenCalled();
    });
  });
});
