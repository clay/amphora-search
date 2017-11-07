'use strict';
const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  clayLog = require('clay-log');

describe(_.startCase(filename), function () {
  let sandbox, fakeLogger;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    fakeLogger = sandbox.stub();
    lib.setLogger(fakeLogger);
  });

  afterEach(function () {
    sandbox.restore();
    lib.setLogger(undefined);
  });

  describe('init', function () {
    const fn = lib[this.title];

    it('does not call init once it has already been instantiated', function () {
      sandbox.stub(clayLog, 'init');
      fn();
      sinon.assert.notCalled(clayLog.init);
    });
  });
});
