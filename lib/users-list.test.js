'use strict';

const _ = require('lodash'),
  expect = require('chai').expect,
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  elastic = require('./services/elastic'),
  responses = require('./services/responses'),
  helpers = require('./services/elastic-helpers');

describe(_.startCase(filename), function () {
  let sandbox, logSpy;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(elastic);
    sandbox.stub(responses);
    sandbox.stub(helpers);
    logSpy = sandbox.spy();

    lib.setLog(logSpy);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('removeUsers', function () {
    const fn = lib[this.title],
      userOps = [{
        type: 'delete',
        key: '/_users/someEncodedString'
      }, {
        type: 'delete',
        key: '/_users/anotherEncodedString'
      }];

    it('iterates through an array of delete ops for users and removes each one', function () {
      elastic.del.returns(Promise.resolve({ _id: 'cool' }));
      fn(userOps);
      sinon.assert.calledTwice(elastic.del);
    });
  });

  describe('handleResult', function () {
    const fn = lib[this.title];

    it('logs errors', function () {
      var error = new Error('foobar');

      fn(error);
      sinon.assert.calledWith(logSpy, 'error', 'foobar');
    });

    it('logs success messages', function () {
      fn({ _id: 'someId' });
      sinon.assert.calledWith(logSpy, 'debug', 'User data updates for user: someId');
    });
  });

  describe('updateUserList', function () {
    const fn = lib[this.title],
      userOp = {
        type: 'put',
        key: '/_users/someEncodedString',
        value: '{"name": "cool.person@google.com", "auth": "write", "provider": "google"}'
      };

    it('calls elastic.update with `/_users/` trimmed from the id', function (done) {
      elastic.update.returns(Promise.resolve({_id: 'cool person'}));

      fn(userOp)
        .each(function () {
          sinon.assert.calledOnce(elastic.update);
          sinon.assert.calledWith(elastic.update, 'users', 'someEncodedString');
        })
        .done(() => done());
    });

    it('logs an error if one occurs', function (done) {
      elastic.update.returns(Promise.reject(new Error('error')));

      fn(userOp)
        .each(function (resp) {
          expect(resp).to.be.an.instanceof(Error);
        })
        .done(() => done());
    });
  });
});
