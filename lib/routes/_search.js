'use strict';

const _ = require('lodash'),
  elastic = require('../services/elastic'),
  helpers = require('../services/elastic-helpers'),
  responses = require('../services/responses'),
  log = require('../services/log').setup({ file: __filename });

/**
 * Add the prefix to any index specified
 *
 * @param  {Object} queryObj
 * @return {Object}
 */
function decorateWithPrefix(queryObj) {
  if (!queryObj.index) {
    let err = new Error('An index property is required to search');

    log('error', err.message, { stack: err.stack });
    return bluebird.reject(err);
  }

  queryObj.index = helpers.indexWithPrefix(queryObj.index);

  console.log(queryObj);

  return queryObj;
}

/**
 * Return a function for `expectJSON` to evaluate which
 * will query Elastic with the payload from the client's
 * request
 *
 * Check if query object is an array or an object
 *
 * @param  {object} queryObj
 * @return {function}
 */
function elasticPassthrough(queryObj) {
  return function () {
    if (_.isArray(queryObj.body)) {
      return elastic.client.msearch(decorateWithPrefix(queryObj));
    } else {
      return elastic.client.search(decorateWithPrefix(queryObj))
        .then((result) => {
          console.log('****', result);
          return result;
        });
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
