'use strict';

const _ = require('lodash'),
  expect = require('chai').expect,
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  elastic = require('./services/elastic'),
  responses = require('./services/responses'),
  helpers = require('./services/elastic-helpers'),
  queue = require('./services/queue'),
  winston = require('winston');

describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(elastic);
    sandbox.stub(queue);
    sandbox.stub(responses);
    sandbox.stub(helpers);
    sandbox.stub(winston);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('removeUsers', function () {
    const fn = lib[this.title],
      userOps = [{
        type: 'delete',
        key: '/users/someEncodedString'
      }, {
        type: 'delete',
        key: '/users/anotherEncodedString'
      }]

    it('iterates through an array of delete ops for users and removes each one', function () {
      elastic.del.returns(Promise.resolve({ _id: 'cool' }));
      fn(userOps);
      sinon.assert.calledTwice(elastic.del);
    });
  });

  describe('updateUserList', function () {
    const fn = lib[this.title],
      userOps = [{
        type: 'put',
        key: '/users/someEncodedString',
        value: '{"name": "cool.person@google.com", "auth": "write", "provider": "google"}'
      }],
      nonUserOps = [{
        type: 'put',
        key: 'site.com/components/article/instances/someInstance'
      }];

    it('returns undefined if no user op is found', function () {
      expect(fn(nonUserOps)).to.be.undefined;
    });


    it('calls elastic.update with `/users/` trimmed from the id', function () {
      elastic.update.returns(Promise.resolve({_id: 'cool person'}))
      return fn(userOps).then(function () {
        sinon.assert.calledOnce(elastic.update);
        sinon.assert.calledWith(elastic.update, 'users', 'general', 'someEncodedString');
      });
    });

    it('calls elastic.update with `/users/` trimmed from the id', function () {
      elastic.update.returns(Promise.resolve({_id: 'cool person'}))
      return fn(userOps).then(function () {
        sinon.assert.calledOnce(elastic.update);
        sinon.assert.calledWith(elastic.update, 'users', 'general', 'someEncodedString');
      });
    });

    it('logs an error if one occurs', function () {
      elastic.update.returns(Promise.reject(new Error('error')))
      return fn(userOps).then(function (resp) {
        expect(resp).to.be.an.instanceof(Error)
      });
    });
  });
});
