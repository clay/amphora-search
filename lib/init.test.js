/* eslint-disable max-nested-callbacks */
'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  logMock = jest.fn(),
  routesMock = jest.fn(),
  busMock = jest.fn(),
  setupMock = jest.fn(),
  listsMock = jest.fn();

beforeEach(() => {
  lib.setLog(logMock);
  lib.setSetup(setupMock);
  lib.setRoutes(routesMock);
  lib.setBus(busMock);
  lib.setLists(listsMock);
});

describe(filename, () => {
  describe('onInit', () => {
    test('calls the Elastic `batch` function', () => {
      setupMock.mockResolvedValue(Promise.resolve());
      routesMock.mockResolvedValue();
      busMock.mockResolvedValue();
      listsMock.mockResolvedValue();

      return lib({}).then(func => func()).then(() => {
        expect(setupMock).toHaveBeenCalled();
        expect(routesMock).toHaveBeenCalled();
        expect(busMock).toHaveBeenCalled();
      });
    });

    test('logs an error when instantiating lists', () => {
      setupMock.mockResolvedValue(Promise.resolve());
      routesMock.mockResolvedValue();
      busMock.mockResolvedValue();
      listsMock.mockRejectedValue(new Error('foo'));
      lib.setInitialized(false);

      return lib({}).then(func => func()).then(() => {
        expect(logMock).toHaveBeenCalled();
      });
    });

    test('only initializes lists on time', () => {
      setupMock.mockResolvedValue(Promise.resolve());
      routesMock.mockResolvedValue();
      busMock.mockResolvedValue();
      listsMock.mockResolvedValue();

      return lib({}).then(func => {
        return func().then(() => func());
      }).then(() => {
        expect(setupMock).toHaveBeenCalled();
        expect(routesMock).toHaveBeenCalled();
        expect(busMock).toHaveBeenCalled();
      });
    });

    it('logs an error if the batch function rejects', () => {
      setupMock.mockResolvedValue(Promise.reject(new Error('foo')));

      return lib({}).then(func => func())
        .catch(err => {
          expect(err).toBeInstanceOf(Error);
          expect(err).toHaveProperty('message', 'foo');
          expect(logMock).toHaveBeenCalled();
        });
    });
  });
});
