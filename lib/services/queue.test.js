'use strict';
const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  bluebird = require('bluebird');


function promise() {
  return new bluebird(function (resolve) {
    resolve('called');
  });
}


describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('add', function () {
    const fn = lib[this.title];

    it('works', function () {
      return fn(promise)
        .then(function (resp) {
          expect(resp).to.equal('called');
        });
    });
  });
});
