'use strict';

const elastic = require('../services/elastic'),
  bluebird = require('bluebird'),
  helpers = require('../services/elastic-helpers'),
  responses = require('../services/responses'),
  log = require('../services/log').setup({ file: __filename });

/**
 * Validate update request for existence of index, type, id, and body
 * Add the prefix to any index specified
 *
 * @param  {Object} updateBody
 * @return {Object}
 */
function validateUpdateRequest(updateBody) {
  if (!updateBody.index || !updateBody.id || !updateBody.body) {
    let err = new Error('An index, id, and body property are all required to update');

    log('error', err.message, { stack: err.stack });
    throw err;
    // return bluebird.reject(err);
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
    var { index, id, body, refresh } = validateUpdateRequest(updateBody);

    return elastic.update(index, id, body, refresh);
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
