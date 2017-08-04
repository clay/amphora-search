'use strict';
const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  pageList = require('./page-list'),
  setup = require('./setup');

describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    sandbox.stub(pageList, 'updatePageData');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('unpublish', function () {
    const payload = { uri: 'host/some/uri' };

    it('calls the updatePageData function', function () {
      var spy = sinon.spy();

      lib.setLog(spy);
      pageList.updatePageData.returns(Promise.resolve());

      return lib(payload)
        .then(function () {
          sinon.assert.calledOnce(pageList.updatePageData);
          sinon.assert.calledWith(spy, 'info');
        });
    });

    it('logs the error', function () {
      var spy = sinon.spy();

      lib.setLog(spy);
      pageList.updatePageData.returns(Promise.reject({ stack: 'error' }));


      return lib(payload)
        .then(function () {
          sinon.assert.calledWith(spy, 'error');
        });
    });

    it('calls the `executeUnpubHandlers` function', function () {
      sandbox.stub(lib, 'executeUnpubHandlers');
      pageList.updatePageData.returns(Promise.resolve());

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
