'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  logMock = jest.fn(),
  elastic = require('../services/elastic');

elastic.del = jest.fn();
elastic.update = jest.fn();

beforeEach(() => {
  lib.setLog(logMock);
});

describe(filename, () => {
  describe('index', () => {
    test('it sets the user index', () => {
      expect(lib.index()).toEqual('users');
    });
  });

  describe('filter', () => {
    test('it returns true if key is user', () => {
      expect(lib.filter({ key: '/_users/foo' })).toEqual(true);
    });

    test('it returns false if key is not layout', () => {
      expect(lib.filter({ key: 'example.com/_pages/foo' })).toEqual(false);
    });
  });

  describe('serialize', () => {
    const obj = {
      key: '/_users/foo',
      value: { foo: 'bar' }
    };

    test('it removes /_users/ from the key', () => {
      expect(lib.serialize(obj)).toEqual({
        key: 'foo',
        value: { foo: 'bar' }
      });
    });

    test('it throws a TypeError for bad key', () => {
      expect(() => lib.serialize({ key: {}, value: obj.value })).toThrow();
      expect(() => lib.serialize({ key: 1, value: obj.value })).toThrow();
      expect(() => lib.serialize({ key: true, value: obj.value })).toThrow();
      expect(() => lib.serialize({ key: undefined, value: obj.value })).toThrow();
    });

    test('it throws a TypeError for bad value', () => {
      expect(() => lib.serialize({ key: obj.key, value: '{"foo": "bar"}' })).toThrow();
      expect(() => lib.serialize({ key: obj.key, value: 1 })).toThrow();
      expect(() => lib.serialize({ key: obj.key, value: true })).toThrow();
      expect(() => lib.serialize({ key: obj.key, value: undefined })).toThrow();
    });
  });

  describe('removeUser', () => {
    test('it calls elastic module to delete a user doc', () => {
      elastic.del.mockResolvedValue(true);

      return lib.removeUser({ uri: '/_users/foo'})
        .collect()
        .toPromise(Promise)
        .then(() => {
          expect(elastic.del).toHaveBeenCalled();
        });
    });
  });

  describe('handleResult', () => {
    test('it logs an error message if one is passed in', () => {
      lib.handleResult(new Error('foo'));
      expect(logMock).toHaveBeenCalled();
    });

    test('it logs a passed in message with the document _id', () => {
      lib.handleResult({ _id: 'foo' }, 'some msg');
      expect(logMock).toHaveBeenCalledWith('debug', 'some msg: foo');
    });
  });
});
