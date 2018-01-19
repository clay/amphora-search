'use strict';

const responses = require('../services/responses'),
  updatePage = require('../services/update-page');

function response(req, res) {
  if (!req.isAuthenticated()) {
    responses.redirectToLogin(req, res);
  } else {
    responses.streamOperation(updatePage(req.body))(res);
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
