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

  it('generates new page data', function () {
    let result;

    utils.getSite.returns(Promise.resolve('foo'));
    return lib({ uri }).then(function () {
      result = utils.updatePage.getCall(0).args[1];

      expect(result.uri).to.equal(uri);
      expect(result.createdAt).to.be.a('number');
      expect(result.archived).to.equal(false);
      expect(result.published).to.equal(false);
      expect(result.scheduled).to.equal(false);
      expect(result.scheduledTime).to.equal(null);
      expect(result.publishTime).to.equal(null);
      expect(result.updateTime).to.equal(null);
      expect(result.firstPublishTime).to.equal(null);
      expect(result.url).to.equal('');
      expect(result.title).to.equal('');
      expect(result.authors).to.eql([]);
      expect(result.users).to.eql([]);
      expect(result.history[0].action).to.equal('create');
      expect(result.siteSlug).to.equal('foo');
    });
  });
});
