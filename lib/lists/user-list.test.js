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
  describe('setUserIndex', () => {
    test('it sets the user index', () => {
      expect(lib.setUserIndex()).toBe('users');
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

  describe('updateUserList', () => {
    test('it calls elastic module to delete a user doc', () => {
      const value = {bar: true};

      elastic.update.mockResolvedValue(true);
      return lib.updateUserList({ key: '/_users/foo', value })
        .collect()
        .toPromise(Promise)
        .then(() => {
          expect(elastic.update).toHaveBeenCalledWith('users', 'foo', value, false, true);
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