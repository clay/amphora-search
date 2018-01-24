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

  describe('unpublish', function () {
    const payload = { uri: 'host/some/uri' };

    it('calls the `executeUnpubHandlers` function', function () {
      sandbox.stub(lib, 'executeUnpubHandlers');

      return lib(payload)
        .then(function () {
          sinon.assert.calledOnce(lib.executeUnpubHandlers);
        });
    });

    it('executes a handler unpublish function if one is exported', function () {
      var spy = sinon.spy();

      setup.handlers = [{unpublish: spy}];
      lib.executeUnpubHandlers();
      sinon.assert.calledOnce(spy);
    });
  });
});
