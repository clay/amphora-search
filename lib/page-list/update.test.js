'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  expect = require('chai').expect,
  utils = require('./utils'),
  uri = 'domain.com/_pages/abc';

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

  it('creates page if it does not exist', function () {
    let creationResult, updateResult;

    utils.findPage.returns(Promise.resolve(null));
    utils.getSite.returns(Promise.resolve('foo'));
    utils.updatePage.returns(Promise.resolve());
    return fn({ uriOrUrl: uri, data: { archived: false, history: [], title: 'hi' }, user: {} }).then(function () {
      creationResult = utils.updatePage.getCall(0).args[1],
      updateResult = utils.updatePage.getCall(1).args[1];

      expect(_.get(creationResult, 'history.0.action')).to.eql('create');
      expect(updateResult.title).to.eql('hi');
    });
  });

  it('throws error if page does not exist and url is not a page uri', function () {
    utils.findPage.returns(Promise.resolve(null));

    return fn({ uriOrUrl: 'http://domain.com/some-url', data: { title: 'hi' }, user: {} }).catch(function (e) {
      expect(e.message).to.eql('Cannot create page with uri "http://domain.com/some-url"');
    });
  });
});
