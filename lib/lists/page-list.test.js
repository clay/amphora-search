'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  elastic = require('../services/elastic'),
  logMock = jest.fn(),
  PAGE_URI = 'foo.com/_pages/foo';

beforeEach(() => {
  lib.setLog(logMock);
  elastic.update = jest.fn();
});

describe(filename, () => {
  describe('setPagesIndex', () => {
    test('it sets the pages index', () => {
      expect(lib.setPagesIndex()).toBe('pages');
    });
  });

  describe('updateLayout', () => {
    const fn = lib.updatePage;

    test('it throws an error if the data is not an object', () => {
      expect(fn).toThrow();
    });

    test('it throws an error if the uri is not a string', () => {
      expect(() => fn(123, {})).toThrow();
    });

    test('it calls the elastic update function and logs successful results', () => {
      elastic.update.mockResolvedValue({ _id: 'foo' });

      return fn(PAGE_URI, {})
        .then(() => {
          expect(logMock).toHaveBeenCalledWith('debug', 'Updated page in pages list: foo');
        });
    });

    test('it calls the elastic update function and logs error messages', () => {
      elastic.update.mockRejectedValue(new Error('foo'));

      return fn(PAGE_URI, {})
        .catch(err => {
          expect(logMock).toHaveBeenCalled();
          expect(err).toHaveProperty('code', 500);
        });
    });

    test('it attaches a 400 status for dynamic mapping exceptions', () => {
      elastic.update.mockRejectedValue(new Error('strict_dynamic_mapping_exception foo bar'));

      return fn(PAGE_URI, {})
        .catch(err => {
          expect(logMock).toHaveBeenCalled();
          expect(err).toHaveProperty('code', 400);
        });
    });
  });
});