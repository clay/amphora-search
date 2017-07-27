'use strict';

const _ = require('lodash'),
  elastic = require('../services/elastic'),
  helpers = require('../services/elastic-helpers'),
  responses = require('../services/responses');

/**
 * Add the prefix to any index specified
 *
 * @param  {Object} queryObj
 * @return {Object}
 */
function decorateWithPrefix(queryObj) {
  if (!queryObj.index) {
    throw new Error('An index property is required to search');
  }

  queryObj.index = helpers.indexWithPrefix(queryObj.index);

  return queryObj;
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
    if (_.isArray(queryObj.body)) {
      return elastic.client.msearch(decorateWithPrefix(queryObj));
    } else {
      return elastic.client.search(decorateWithPrefix(queryObj));
    }
  };
}

function response(req, res) {
  if (!req.isAuthenticated()) {
    responses.redirectToLogin(req, res);
  } else {
    responses.expectJSON(elasticPassthrough(req.body), res);
  }
}

function routes(router) {
  router.post('/', response);
}

module.exports = routes;
// For testing
module.exports.elasticPassthrough = elasticPassthrough;
module.exports.response = response;
