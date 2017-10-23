'use strict';
const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  pageList = require('./page-list'),
  usersList = require('./users-list');

describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    sandbox.stub(pageList, 'updatePageData');
    sandbox.stub(usersList);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('delete', function () {
    const payload = [{ type: 'del', key: 'host/some/pages/@scheduled' } ],
      userPayload = [{ type: 'del', key: '/users/someUser' } ];

    it('calls the updatePageData function', function () {
      var spy = sinon.spy();

      lib.setLog(spy);
      pageList.updatePageData.returns(Promise.resolve());

      return lib(payload)
        .then(function () {
          sinon.assert.calledOnce(pageList.updatePageData);
          sinon.assert.calledWith(spy, 'debug');
        });
    });

    it('calls the removeUsers function', function () {
      return lib(userPayload)
        .then(function () {
          sinon.assert.calledOnce(usersList.removeUsers);
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

    it('does nothing if no @scheduled instance is found', function () {
      var spy = sinon.spy();

      lib.setLog(spy);
      sinon.assert.notCalled(spy);
      sinon.assert.notCalled(pageList.updatePageData);
      return lib([{op: 'del', key: 'host/some/uri'}]);
    });
  });
});
