'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  expect = require('chai').expect,
  utils = require('./utils'),
  uri = 'domain.com/_components/abc/instances/def';

describe(`Layout List: ${_.startCase(filename)}:`, function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(utils);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('publishes layouts for the first time', function () {
    let result;

    utils.getLayout.returns(Promise.resolve({ history: [] }));
    return lib({ uri, data: { content: 'content' } }).then(function () {
      result = utils.updateLayout.getCall(0).args[1];

      expect(result.published).to.equal(true);
      expect(result.publishTime).to.be.a('date');
      expect(result.firstPublishTime).to.eql(result.publishTime);
      expect(result.history[0].action).to.equal('publish');
    });
  });

  it('creates layouts that do not exist (when publishing)', function () {
    let result;

    utils.getLayout.returns(Promise.reject());
    utils.getSite.returns(Promise.resolve('foo'));
    return lib({ uri, data: { content: 'content' } }).then(function () {
      result = utils.updateLayout.getCall(0).args[1];

      expect(result.published).to.equal(true);
      expect(result.publishTime).to.be.a('date');
      expect(result.firstPublishTime).to.eql(result.publishTime);
      expect(result.history[0].action).to.equal('create');
      expect(result.history[1].action).to.equal('publish');
      expect(result.siteSlug).to.eql('foo');
      expect(result.createTime).to.be.a('date');
    });
  });

  it('publishes layouts subsequently', function () {
    let d = new Date(),
      result;

    utils.getLayout.returns(Promise.resolve({ firstPublishTime: d, history: [{ action: 'publish' }] }));
    return lib({ uri, data: { content: 'content' } }).then(function () {
      result = utils.updateLayout.getCall(0).args[1];

      expect(result.published).to.equal(true);
      expect(result.publishTime).to.be.a('date');
      expect(result.firstPublishTime).to.eql(d);
      expect(result.history[1].action).to.equal('publish');
    });
  });

  it('unschedules layouts when publishing', function () {
    let result;

    utils.getLayout.returns(Promise.resolve({ history: [{ action: 'schedule' }], scheduled: true }));
    return lib({ uri, data: { content: 'content' } }).then(function () {
      result = utils.updateLayout.getCall(0).args[1];

      expect(result.published).to.equal(true);
      expect(result.scheduled).to.equal(false);
      expect(result.publishTime).to.be.a('date');
      expect(result.firstPublishTime).to.eql(result.publishTime);
      expect(result.history[1].action).to.equal('unschedule');
      expect(result.history[2].action).to.equal('publish');
    });
  });
});
