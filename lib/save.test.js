'use strict';
const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
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

  describe('executeHandlers', function () {
    const fn = lib;

    it('calls the save function on handlers', function () {
      var saveFunc = sandbox.stub();

      setup.handlers = [{ when: _.constant(true), save: saveFunc }];
      fn([{ key: '/some/component/uri' }]);
    });

    it('does not call the save function on when the `when` fails', function () {
      var saveFunc = sandbox.stub();

      setup.handlers = [{ when: _.constant(false), save: saveFunc }];
      fn([{ key: '/some/component/uri' }]);
      expect(saveFunc.calledOnce).to.be.false;
    });
  });
});
