'use strict';

const elastic = require('../services/elastic'),
  responses = require('../services/responses');

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
  router.post('/', function (req, res) {
    responses.expectJSON(elasticPassthrough(req.body), res);
  });
}

module.exports = routes;
// For testing
module.exports.elasticPassthrough = elasticPassthrough;
