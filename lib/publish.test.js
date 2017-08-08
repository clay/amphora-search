'use strict';
const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  setup = require('./setup');

describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('publish', function () {
    it('calls a handler\'s publish function if it exists', function () {
      const spy = sinon.spy();

      setup.handlers = [{publish: spy}];
      lib();
      sinon.assert.calledOnce(spy);
    });

    it('Does not call handlers with no publish function', function () {
      const spy = sinon.spy(),
        spy2 = sinon.spy();

      setup.handlers = [{publish: spy}, {unpublish: spy2 }];
      lib();
      sinon.assert.calledOnce(spy);
      sinon.assert.notCalled(spy2);
    });
  });
});
