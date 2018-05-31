'use strict';

const _ = require('lodash'),
  responses = require('../services/responses'),
  layoutListUpdater = require('../layout-list/update');

function response(req, res) {
  if (!req.isAuthenticated()) {
    responses.redirectToLogin(req, res);
  } else {
    responses.expectJSON(layoutListUpdater.update.bind(null, { uri: _.get(req, 'body.uri'), data: _.get(req, 'body.value'), user: req.user }), res);
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
