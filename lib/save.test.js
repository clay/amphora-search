'use strict';
const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  pageList = require('./page-list'),
  usersList = require('./users-list'),
  setup = require('./setup');


describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(pageList);
    sandbox.stub(usersList);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('onSave', function () {
    it('returns undefined if ops is not an array', function () {
      expect(lib('string')).to.be.undefined;
    });

    it('calls the `updateUserList` function if there are user ops', function () {
      var sampleUserOps = [{key: '/users/encodedUsers'}];

      pageList.filterForPageOps.returns([]);
      usersList.testForUser.returns(sampleUserOps);
      lib(sampleUserOps);
      expect(usersList.updateUserList.calledOnce).to.be.true;
    });
  });

  describe('executeHandlers', function () {
    const fn = lib[this.title];

    it('calls the save function on handlers', function () {
      var saveFunc = sandbox.stub();

      setup.handlers = [{ when: _.constant(true), save: saveFunc }];
      fn([{ key: '/some/component/uri' }]);
    });

    it('does not call the save function on when the `when` fails', function () {
      var saveFunc = sandbox.stub();

      setup.handlers = [{ when: _.constant(false), save: saveFunc }];
      fn([{ key: '/some/component/uri' }]);
      expect(saveFunc.calledOnce).to.be.false;
    });
  });
});
