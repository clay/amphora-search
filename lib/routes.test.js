'use strict';
const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  files = require('nymag-fs'),
  path = require('path');

function createMockRouter() {
  return {
    use: _.noop,
    all: _.noop,
    get: _.noop,
    put: _.noop,
    post: _.noop,
    delete: _.noop
  };
}

describe(_.startCase(filename), function () {
  let sandbox, router = createMockRouter();

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('setupRoutes', function () {
    it('adds a path router for every file in "routes"', function () {
      var numOfFiles = files.getFiles([__dirname, 'routes'].join(path.sep)).length;

      // Stub the router
      sandbox.stub(router, 'use');
      // Envoke the function
      lib(router);
      // Check callcount
      expect(router.use.callCount).to.equal(numOfFiles);
    });
  });

  describe('removeExtension', function () {
    const fn = lib[this.title];

    it('basic case', function () {
      expect(fn('something.something')).to.equal('something');
    });

    it('with slashes', function () {
      expect(fn('./folder/something.something')).to.equal('./folder/something');
    });

    it('does not do anything if there is no leading dot', function () {
      expect(fn('/folder/something')).to.equal('/folder/something');
    });
  });
});
