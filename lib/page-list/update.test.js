'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  expect = require('chai').expect,
  utils = require('./utils'),
  uri = 'domain.com/pages/abc';

describe(`Page List: ${_.startCase(filename)}:`, function () {
  const fn = lib.update;

  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(utils);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('throws error if no url', function () {
    expect(() => fn()).to.throw(Error);
  });

  it('throws error if no value', function () {
    expect(() => fn({ uriOrUrl: 'abc'})).to.throw(Error);
  });

  it('archives existing pages', function () {
    let result;

    utils.findPage.returns(Promise.resolve({ archived: false, history: [] }));
    utils.updatePage.returns(Promise.resolve());
    return fn({ uriOrUrl: uri, data: { archived: true, history: [] } }).then(function () {
      result = utils.updatePage.getCall(0).args[1];

      expect(result.archived).to.equal(true);
      expect(result.history[0].action).to.equal('archive');
    });
  });

  it('unarchives existing pages', function () {
    let result;

    utils.findPage.returns(Promise.resolve({ archived: true, history: [] }));
    utils.updatePage.returns(Promise.resolve());
    return fn({ uriOrUrl: uri, data: { archived: false, history: [] } }).then(function () {
      result = utils.updatePage.getCall(0).args[1];

      expect(result.archived).to.equal(false);
      expect(result.history[0].action).to.equal('unarchive');
    });
  });

  it('does not set archived state if it has not changed', function () {
    let result;

    utils.findPage.returns(Promise.resolve({ archived: false, history: [] }));
    utils.updatePage.returns(Promise.resolve());
    return fn({ uriOrUrl: uri, data: { archived: false, history: [] } }).then(function () {
      result = utils.updatePage.getCall(0).args[1];

      expect(result.archived).to.equal(false);
      expect(result.history).to.eql([]);
    });
  });

  it('does not update page if not found', function () {
    utils.findPage.returns(Promise.resolve(null));
    return fn({ uriOrUrl: uri, data: { archived: false, history: [] } }).then(function () {
      expect(utils.updatePage.called).to.equal(false);
    });
  });
});
