'use strict';
const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  path = require('path'),
  es = require('./services/elastic'),
  fixturesPath = path.resolve('./test/fixtures');


describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(es);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('setup', function () {
    const idealOptions = {someOpt: 'value', prefix: 'test-', mappings: fixturesPath, handlers: fixturesPath };

    it('attaches `options` object to `module.exports`', function () {
      lib(idealOptions);
      lib.options = idealOptions;
    });

    it('does not attach a prefix if it is not a string', function () {
      var options = {someOpt: 'value', prefix: 212};

      lib(options);
      lib.options = options;
    });

    it('validates ES indices', function () {
      lib(idealOptions);
      expect(es.validateIndices.calledOnce).to.be.true;
    });
  });
});
