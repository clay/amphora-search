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

  it('publishes pages for the first time', function () {
    let result;

    utils.getPage.returns(Promise.resolve({ history: [] }));
    return lib({ uri, data: { url: 'hi' } }).then(function () {
      result = utils.updatePage.getCall(0).args[1];

      expect(result.published).to.equal(true);
      expect(result.publishTime).to.be.a('date');
      expect(result.firstPublishTime).to.eql(result.publishTime);
      expect(result.url).to.equal('hi');
      expect(result.history[0].action).to.equal('publish');
    });
  });

  it('publishes pages subsequently', function () {
    let d = new Date(),
      result;

    utils.getPage.returns(Promise.resolve({ firstPublishTime: d, history: [] }));
    return lib({ uri, data: { url: 'hi' } }).then(function () {
      result = utils.updatePage.getCall(0).args[1];

      expect(result.published).to.equal(true);
      expect(result.publishTime).to.be.a('date');
      expect(result.firstPublishTime).to.eql(d);
      expect(result.url).to.equal('hi');
      expect(result.history[0].action).to.equal('publish');
    });
  });
});
