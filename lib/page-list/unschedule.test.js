'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  expect = require('chai').expect,
  utils = require('./utils'),
  uri = 'domain.com/pages/abc';

describe(`Page List: ${_.startCase(filename)}:`, function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(utils);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('unschedules pages', function () {
    let d = new Date(0),
      result;

    utils.getPage.returns(Promise.resolve({
      scheduled: true,
      scheduledTime: d,
      history: [{ action: 'schedule', timestamp: d, users: [{}] }]
    }));
    return lib({ uri }).then(function () {
      result = utils.updatePage.getCall(0).args[1];

      expect(result.scheduled).to.equal(false);
      expect(result.scheduledTime).to.equal(null);
      expect(result.history[1].action).to.equal('unschedule');
    });
  });
});
