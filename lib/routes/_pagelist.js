'use strict';

const pageList = require('../page-list'),
  responses = require('../services/responses');

function response(req, res) {
  if (!req.isAuthenticated()) {
    responses.redirectToLogin(req, res);
  } else {
    pageList.findPageAndUpdate(req.body, res);
  }
}

/**
 * Default function for adding routes
 * @param  {Object} router
 */
function routes(router) {
  router.post('/', response);
}

module.exports = routes;
// For testing
module.exports.response = response;
