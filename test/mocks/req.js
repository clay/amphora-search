'use strict';

const _ = require('lodash');

function createReq() {
  return {
    isAuthenticated: jest.fn()
  };
}

function createReqWithBody(body) {
  return _.assign(createReq(), body);
}

module.exports = createReq;
module.exports.createReqWithBody = createReqWithBody;
