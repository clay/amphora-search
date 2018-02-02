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

  it('schedules pages', function () {
    let d = new Date(),
      result;

    utils.utcDate.returns(d);
    utils.getPage.returns(Promise.resolve({ history: [] }));
    return lib({ uri, data: { at: 0 } }).then(function () {
      result = utils.updatePage.getCall(0).args[1];

      expect(result.scheduled).to.equal(true);
      expect(result.scheduledTime).to.eql(d);
      expect(result.history[0].action).to.equal('schedule');
    });
  });
});
