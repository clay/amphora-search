'use strict';

const _ = require('lodash'),
  responses = require('../services/responses'),
  pageListUpdater = require('../page-list/update');

function response(req, res) {
  if (!req.isAuthenticated()) {
    responses.redirectToLogin(req, res);
  } else {
    return pageListUpdater.update({ uriOrUrl: _.get(req, 'body.url'), data: _.get(req, 'body.value'), user: req.user }).then(function (result) {
      responses.expectJSON(() => result, res);
    });
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
