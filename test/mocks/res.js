'use strict';

const _ = require('lodash'),
  sinon = require('sinon');

function createRes() {
  return {
    send: sinon.spy(),
    type: sinon.spy(),
    redirect: sinon.spy()
  };
}

module.exports = createRes;
