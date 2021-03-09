'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename);

describe(filename, () => {
  describe('index', () => {
    test('it sets the layouts index', () => {
      expect(lib.index()).toEqual('layouts');
    });
  });

  describe('filter', () => {
    test('it returns true if key or uri is layout', () => {
      expect(lib.filter({ key: 'example.com/_layouts/foo' })).toEqual(true);
      expect(lib.filter({ uri: 'example.com/_layouts/foo' })).toEqual(true);
    });

    test('it returns false if key or uri is not layout', () => {
      expect(lib.filter({ key: 'example.com/_pages/foo' })).toEqual(false);
      expect(lib.filter({ uri: 'example.com/_pages/foo' })).toEqual(false);
    });
  });

  describe('serialize', () => {
    const obj = {
      key: 'example.com/_layouts/foo@published',
      value: { foo: 'bar' }
    };

    test('it removes @published from the key or uri', () => {
      expect(lib.serialize(obj)).toEqual({
        key: 'example.com/_layouts/foo',
        value: { foo: 'bar' }
      });

      expect(lib.serialize({ uri: obj.key, data: obj.value })).toEqual({
        key: 'example.com/_layouts/foo',
        value: { foo: 'bar' }
      });
    });

    test('it throws a TypeError for bad key or uri', () => {
      expect(() => lib.serialize({ key: {}, value: obj.value })).toThrow();
      expect(() => lib.serialize({ key: 1, value: obj.value })).toThrow();
      expect(() => lib.serialize({ key: true, value: obj.value })).toThrow();
      expect(() => lib.serialize({ key: undefined, value: obj.value })).toThrow();
      expect(() => lib.serialize({ uri: undefined, value: obj.value })).toThrow();
    });

    test('it throws a TypeError for bad value or data', () => {
      expect(() => lib.serialize({ key: obj.key, value: '{"foo": "bar"}' })).toThrow();
      expect(() => lib.serialize({ key: obj.key, value: 1 })).toThrow();
      expect(() => lib.serialize({ key: obj.key, value: true })).toThrow();
      expect(() => lib.serialize({ key: obj.key, value: undefined })).toThrow();
      expect(() => lib.serialize({ key: obj.key, data: undefined })).toThrow();
    });
  });
});
