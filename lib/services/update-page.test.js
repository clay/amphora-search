'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  pageList = require('../page-list'),
  expect = require('chai').expect,
  sinon = require('sinon');

describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(pageList, 'findPageByUrlOrUri');
    sandbox.stub(pageList, 'updatePageListEntry');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('update', function () {
    const fn = lib,
      success = { status: 'success', code: 200 };

    it('responds with success obj if everything worked', function (done) {
      pageList.findPageByUrlOrUri.returns(Promise.resolve());
      pageList.updatePageListEntry.returns(() => Promise.resolve());

      fn({url: 'foo', value: {}})
        .each(function (result) {
          expect(result).to.eql(success);
        })
        .done(function () {
          done();
        });
    });

    it('responds with fail obj if there was malformed body', function (done) {
      pageList.findPageByUrlOrUri.returns(Promise.resolve());
      pageList.updatePageListEntry.returns(Promise.resolve());

      fn({})
        .each(function (result) {
          var err = new Error('`_pagelist` endpoint cannot update a page without a url');

          err.code = 400;
          expect(result).to.eql(lib.handleError(err));
        })
        .done(function () {
          done();
        });
    });

    it('responds with fail obj if there was a failure in the query', function (done) {
      var err = new Error('foo');

      pageList.findPageByUrlOrUri.returns(Promise.resolve());
      pageList.updatePageListEntry.returns(() => Promise.reject(err));

      fn({url: 'foo', value: {}})
        .each(function (result) {
          expect(result.msg).to.equal('foo');
          expect(result.code).to.equal(500);
        })
        .done(function () {
          done();
        });
    });
  });
});
