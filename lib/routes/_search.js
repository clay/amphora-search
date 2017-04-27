'use strict';

const elastic = require('../services/elastic'),
  responses = require('../services/responses'),
  pageList = require('../page-list');

/**
 * This route passes a payload through to the
 * Elastic Search service and then sends
 * back a JSON response.
 *
 * @param  {object} req [description]
 * @param  {object} res [description]
 */
function response(req, res) {
  // TODO: Test the body for security
  responses.expectJSON(elasticPassthrough(req.body), res);
}

function updatePageList(req, res) {
  // TODO: Test the body for security
  responses.expectJSON(() => pageList.findPageAndUpdate(req.body), res);
}

/**
 * Return a function for `expectJSON` to evaluate which
 * will query Elastic with the payload from the client's
 * request
 *
 * @param  {object} queryObj
 * @return {function}
 */
function elasticPassthrough(queryObj) {
  return function () {
    return elastic.client.search(queryObj);
  };
}

function routes(router) {
  router.post('/', response);
  router.post('/pages', updatePageList);
}

module.exports = routes;
// For testing
module.exports.elasticPassthrough = elasticPassthrough;
module.exports.response = response;
