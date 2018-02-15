'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  expect = require('chai').expect,
  utils = require('./utils'),
  uri = 'domain.com/_pages/abc';

describe(`Page List: ${_.startCase(filename)}:`, function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(utils);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('unpublishes pages', function () {
    let d = new Date(0),
      result;

    utils.getPage.returns(Promise.resolve({
      published: true,
      publishTime: d,
      firstPublishTime: d,
      url: 'some url',
      history: [{ action: 'publish', timestamp: d, users: [{}] }]
    }));
    return lib({ uri }).then(function () {
      result = utils.updatePage.getCall(0).args[1];

      expect(result.published).to.equal(false);
      expect(result.publishTime).to.equal(null);
      expect(result.firstPublishTime).to.eql(d);
      expect(result.history[1].action).to.equal('unpublish');
    });
  });

  it('nullifies firstPublishTime if not in page data', function () {
    let d = new Date(0),
      result;

    utils.getPage.returns(Promise.resolve({
      published: true,
      publishTime: d,
      url: 'some url',
      history: [{ action: 'publish', timestamp: d, users: [{}] }]
    }));
    return lib({ uri }).then(function () {
      result = utils.updatePage.getCall(0).args[1];

      expect(result.firstPublishTime).to.eql(null);
    });
  });
});
