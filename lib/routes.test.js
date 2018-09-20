'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  router = createMockRouter(),
  files = require('amphora-fs'),
  path = require('path');

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
  describe('setupRoutes', function () {
    it('adds a path router for every file in "routes"', function () {
      var numOfFiles = files.getFiles([__dirname, 'routes'].join(path.sep)).length;

      // Envoke the function
      lib(router);
      // Check callcount
      expect(router.use).toHaveBeenCalledTimes(numOfFiles);
    });
  });

  describe('removeExtension', function () {
    const fn = lib.removeExtension;

    it('basic case', function () {
      expect(fn('something.something')).toEqual('something');
    });

    it('with slashes', function () {
      expect(fn('./folder/something.something')).toEqual('./folder/something');
    });

    it('does not do anything if there is no leading dot', function () {
      expect(fn('/folder/something')).toEqual('/folder/something');
    });
  });
});
