'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  expect = require('chai').expect,
  utils = require('./utils'),
  uri = 'domain.com/_components/abc/instances/def';

describe(`Layout List: ${_.startCase(filename)}:`, function () {
  const fn = lib.update;

  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(utils);
    utils.updateLayout.returns(Promise.resolve());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('throws error if no uri', function () {
    expect(() => fn()).to.throw(Error);
  });

  it('throws error if no value', function () {
    expect(() => fn({ uri })).to.throw(Error);
  });

  it('allows scheduling layouts', function () {
    utils.getLayout.returns(Promise.resolve({ history: [] }));
    return fn({ uri: uri, data: { scheduled: true, scheduleTime: new Date(), history: [{ action: 'schedule' }] } }).then(() => {
      const result = utils.updateLayout.getCall(0).args[1];

      expect(result.scheduled).to.eql(true);
      expect(result.scheduleTime).to.be.a('date');
      expect(result.history[0].action).to.eql('schedule');
    });
  });

  it('allows unscheduling layouts', function () {
    utils.getLayout.returns(Promise.resolve({ history: [{ action: 'schedule' }], scheduled: true }));
    return fn({ uri: uri, data: { scheduled: false, scheduleTime: null, history: [{ action: 'schedule' }, { action: 'unschedule' }] } }).then(() => {
      const result = utils.updateLayout.getCall(0).args[1];

      expect(result.scheduled).to.eql(false);
      expect(result.scheduleTime).to.eql(null);
      expect(result.history[0].action).to.eql('schedule');
      expect(result.history[1].action).to.eql('unschedule');
    });
  });

  it('allows unpublishing layouts', function () {
    utils.getLayout.returns(Promise.resolve({ history: [{ action: 'publish' }], published: true }));
    return fn({ uri: uri, data: { published: false, publishTime: null, history: [{ action: 'publish' }, { action: 'unpublish' }] } }).then(() => {
      const result = utils.updateLayout.getCall(0).args[1];

      expect(result.published).to.eql(false);
      expect(result.publishTime).to.eql(null);
      expect(result.history[0].action).to.eql('publish');
      expect(result.history[1].action).to.eql('unpublish');
    });
  });

  it('allows updating title', function () {
    utils.getLayout.returns(Promise.resolve({ title: '', history: [] }));
    return fn({ uri: uri, data: { title: 'Some Title', history: [{ action: 'edit' }] } }).then(() => {
      const result = utils.updateLayout.getCall(0).args[1];

      expect(result.title).to.eql('Some Title');
      expect(result.history[0].action).to.eql('edit');
    });
  });

  it('creates layout if it does not exist', function () {
    utils.getLayout.returns(Promise.reject());
    utils.getSite.returns(Promise.resolve('foo'));

    return fn({ uri: uri, data: { scheduled: true, scheduleTime: new Date(), history: [{ action: 'schedule' }] } }).then(() => {
      const result = utils.updateLayout.getCall(0).args[1];

      expect(result.scheduled).to.eql(true);
      expect(result.scheduleTime).to.be.a('date');
      expect(result.uri).to.eql(uri);
      expect(result.createTime).to.be.a('date');
      expect(result.siteSlug).to.eql('foo');
      expect(result.history[0].action).to.eql('create');
      expect(result.history[1].action).to.eql('schedule');
    });
  });

  it('creates layout with default props if it does not exist', function () {
    utils.getLayout.returns(Promise.reject());
    utils.getSite.returns(Promise.resolve('foo'));

    return fn({ uri: uri, data: {} }).then(() => {
      const result = utils.updateLayout.getCall(0).args[1];

      expect(result.scheduled).to.eql(false);
      expect(result.scheduleTime).to.equal(null);
      expect(result.uri).to.eql(uri);
      expect(result.createTime).to.be.a('date');
      expect(result.siteSlug).to.eql('foo');
      expect(result.history[0].action).to.eql('create');
    });
  });
});
