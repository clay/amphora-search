'use strict';

const _ = require('lodash'),
  sinon = require('sinon');

function createReq() {
  return {
    isAuthenticated: sinon.stub()
  };
}

function createReqWithBody(body) {
  return _.assign(createReq(), body);
}

module.exports = createReq;
module.exports.createReqWithBody = createReqWithBody;
