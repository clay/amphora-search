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
  lib.setLists(busMock);
});

describe(filename, () => {
  describe('onInit', () => {
    test('calls the Elastic `batch` function', () => {
      setupMock.mockResolvedValue(Promise.resolve());
      routesMock.mockResolvedValue();
      busMock.mockResolvedValue();
      listsMock.mockResolvedValue();

      return lib({})().then(() => {
        expect(setupMock).toHaveBeenCalled();
        expect(routesMock).toHaveBeenCalled();
        expect(busMock).toHaveBeenCalled();
      });
    });

    it('logs an error if the batch function rejects', () => {
      setupMock.mockResolvedValue(Promise.reject(new Error('foo')));

      return lib({})()
        .catch(err => {
          expect(err).toBeInstanceOf(Error);
          expect(err).toHaveProperty('message', 'foo');
          expect(logMock).toHaveBeenCalled();
        });
    });
  });
});
