'use strict';

const responses = require('../services/responses'),
  pageList = require('../page-list');

/**
 * Default function for adding routes
 * @param  {Object} router
 */
function routes(router) {
  router.post('/', function (req, res) {
    responses.expectJSON(() => pageList.findPageAndUpdate(req.body), res);
  });
}

module.exports = routes;
