'use strict';
const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  pageList = require('./page-list'),
  setup = require('./setup');


describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(pageList);
    sandbox.stub(setup, 'handlers');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('onSave', function () {
    it('returns undefined if ops is not an array', function () {
      expect(lib('string')).to.be.undefined;
    });

    it('calls the `updatePageList` function if there are page ops', function () {
      var samplePageOps = [{key: 'some/pages/uri'}];

      pageList.filterForPageOps.returns(samplePageOps);
      lib(samplePageOps);
      expect(pageList.updatePageList.calledOnce).to.be.true;
    });

    it('skips the `updatePageList` function if there are no page ops', function () {
      var sampleComponentOps = [{key: 'some/components/name'}];

      pageList.filterForPageOps.returns([]);
      sandbox.stub(lib, 'executeHandlers');
      lib(sampleComponentOps);
      expect(pageList.updatePageList.calledOnce).to.be.false;
      expect(lib.executeHandlers.calledOnce).to.be.true;
    });
  });

  describe('executeHandlers', function () {
    const fn = lib[this.title];

    it('calls the save function on handlers', function () {
      var saveFunc = sandbox.stub();

      setup.handlers = [{ when: _.constant(true), save: saveFunc }];
      fn([{ key: '/some/component/uri' }]);
      expect(saveFunc.calledOnce).to.be.true;
    });

    it('does not call the save function on when the `when` fails', function () {
      var saveFunc = sandbox.stub();

      setup.handlers = [{ when: _.constant(false), save: saveFunc }];
      fn([{ key: '/some/component/uri' }]);
      expect(saveFunc.calledOnce).to.be.false;
    });
  });
});
