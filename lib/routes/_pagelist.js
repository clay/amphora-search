'use strict';

const _ = require('lodash'),
  responses = require('../services/responses'),
  update = require('../page-list/update');

function response(req, res) {
  if (!req.isAuthenticated()) {
    responses.redirectToLogin(req, res);
  } else {
    responses.expectJSON(update.bind(null, { uriOrUrl: _.get(req, 'body.url'), data: _.get(req, 'body.value'), user: req.user }), res);
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
