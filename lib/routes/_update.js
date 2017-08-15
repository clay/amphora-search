'use strict';

const elastic = require('../services/elastic'),
  helpers = require('../services/elastic-helpers'),
  responses = require('../services/responses');

/**
 * Add the prefix to any index specified
 *
 * @param  {Object} updateBody
 * @return {Object}
 */
function decorateWithPrefix(updateBody) {
  if (!updateBody.index) {
    throw new Error('An index property is required to update');
  }

  updateBody.index = helpers.indexWithPrefix(updateBody.index);

  return updateBody;
}

/**
 * Return a function for `expectJSON` to evaluate which
 * will update Elastic with the payload from the client's
 * request
 *
 *
 * @param  {object} updateBody
 * @return {function}
 */
function elasticPassthrough(updateBody) {
  return function () {
    var { index, type, id, body } = decorateWithPrefix(updateBody);

    return elastic.update(index, type, id, body);
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
