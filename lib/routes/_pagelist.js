'use strict';

const responses = require('../services/responses'),
  pageList = require('../page-list');

function response(req, res) {
  responses.expectJSON(() => pageList.findPageAndUpdate(req.body), res);
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
