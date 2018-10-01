'use strict';

const h = require('highland'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  createRes = require('../../test/mocks/res'),
  streamRes = require('../../test/mocks/resStream'),
  state = require('./state');

/**
 * Shortcut
 *
 * @param {object} res
 * @param {object} expected
 * @param {Function} finish
 */
function expectResult(res, expected, finish) {
  res
    .each(function (result) {
      expect(result).toEqual(expected);
    })
    .done(() => {
      finish();
    });
}

describe(filename, () => {
  describe('expectJSON', () => {
    const fn = lib.expectJSON,
      func = val => () => Promise.resolve(val),
      rej = val => () => Promise.reject(val),
      res = {
        json: jest.fn(),
        send: jest.fn(),
        status: jest.fn()
      };

    test('sends back JSON when the function resolves', () => {
      const resolution = {prop: 'value'};

      return fn(func(resolution), res)
        .then(() => {
          expect(res.json).toHaveBeenCalledWith(resolution);
        });
    });

    test('errors', () => {
      const resolution = new Error('An error occured');

      return fn(rej(resolution), res)
        .catch(() => {
          expect(res.send).toHaveBeenCalledWith(resolution.stack);
        });
    });

    test('errors with custom code', () => {
      const resolution = new Error('An error occured');

      resolution.code = 400;
      return fn(rej(resolution), res)
        .catch(() => {
          expect(res.status).toHaveBeenCalledWith(400);
        });
    });
  });

  describe('redirectToLogin', () => {
    const fn = lib.redirectToLogin;

    test('calls res.redirect', () => {
      const res = createRes();

      state.setOptions({ sites: { getSiteFromPrefix: jest.fn().mockReturnValue({ prefix: 'site.com', port: 3001 }) } });

      fn({uri: 'site.com/path/_search'}, res);
      expect(res.redirect).toHaveBeenCalled();
    });

    test('uses port 80 if one is not defined', () => {
      const res = createRes();

      state.setOptions({ sites: { getSiteFromPrefix: jest.fn().mockReturnValue({ prefix: 'site.com' }) } });
      fn({uri: 'site.com/path/_search'}, res);
      expect(res.redirect).toHaveBeenCalled();
    });
  });

  describe('streamOperation', function () {
    const fn = lib.streamOperation,
      success = { code: 200, status: 'success'},
      error = { code: 400, status: 'error', msg: 'some msg'};

    it('streams a success response to the client', function (done) {
      const res = streamRes(),
        operation = h.of(success);

      expectResult(res, JSON.stringify(success), done);
      fn(operation)(res);
    });

    it('streams an error response to the client', function (done) {
      const res = streamRes(),
        operation = h.of(error);

      expectResult(res, JSON.stringify(error), done);
      fn(operation)(res);
    });
  });
});
