'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect;

describe('Clay User', function () {
  describe('userOrRobot', function () {
    it('returns user if they exist', function () {
      const user = { username: 'bob', provider: 'twitter' };

      expect(lib(user)).to.eql(user);
    });

    it('returns robot if user does not exist', function () {
      const user = { username: 'bob' };

      expect(lib(user).username).to.equal('robot');
    });
  });
});
