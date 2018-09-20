'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  elastic = require('../services/elastic'),
  logMock = jest.fn(),
  LAYOUT_URI = 'foo.com/_layouts/foo/instances/bar';

beforeEach(() => {
  lib.setLog(logMock);
  elastic.update = jest.fn();
});

describe(filename, () => {
  describe('setLayoutsIndex', () => {
    test('it sets the layouts index', () => {
      expect(lib.setLayoutsIndex()).toBe('layouts');
    });
  });

  describe('updateLayout', () => {
    const fn = lib.updateLayout;

    test('it throws an error if the data is not an object', () => {
      expect(fn).toThrow();
    });

    test('it throws an error if the uri is not a string', () => {
      expect(() => fn(123, {})).toThrow();
    });

    test('it calls the elastic update function and logs successful results', () => {
      elastic.update.mockResolvedValue({ _id: 'foo' });

      return fn(LAYOUT_URI, {})
        .then(() => {
          expect(logMock).toHaveBeenCalledWith('debug', 'Updated layout in layouts list: foo');
        });
    });

    test('it calls the elastic update function and logs error messages', () => {
      elastic.update.mockRejectedValue(new Error('foo'));

      return fn(LAYOUT_URI, {})
        .catch(err => {
          expect(logMock).toHaveBeenCalled();
          expect(err).toHaveProperty('code', 500);
        });
    });

    test('it attaches a 400 status for dynamic mapping exceptions', () => {
      elastic.update.mockRejectedValue(new Error('strict_dynamic_mapping_exception foo bar'));

      return fn(LAYOUT_URI, {})
        .catch(err => {
          expect(logMock).toHaveBeenCalled();
          expect(err).toHaveProperty('code', 400);
        });
    });
  });
});