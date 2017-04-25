'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon');

describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('expectJSON', function () {
    const fn = lib[this.title],
      func = sinon.stub(),
      res = {
        json: _.noop,
        send: _.noop
      };

    it('sends back JSON when the function resolves', function () {
      const resolution = {prop: 'value'};

      func.returns(Promise.resolve(resolution));
      sandbox.stub(res, 'json');
      fn(func, res);
      expect(res.json.calledWith(resolution));
    });

    it('errors', function () {
      const resolution = new Error('An error occured');

      func.returns(Promise.reject(resolution));
      sandbox.stub(res, 'send');
      fn(func, res);
      expect(res.send.calledWith(resolution.stack));
    });
  });

});
