'use strict';

const _ = require('lodash'),
  elastic = require('../services/elastic'),
  responses = require('../services/responses');

/**
 * This route passes a payload through to the
 * Elastic Search service and then sends
 * back a JSON response.
 *
 * @param  {object} req [description]
 * @param  {object} res [description]
 */
function response(req, res) {
  responses.expectJSON(querySites, res);
}

/**
 * Return a function for `expectJSON` to evaluate which
 * will query Elastic with the payload from the client's
 * request
 *
 * @param  {object} queryObj
 * @return {function}
 */
function querySites() {
  return elastic.query('sites', { size: 50 }, 'general')
    .then((result) => _.get(result, 'hits.hits', []));
}

function routes(router) {
  router.get('/', response);
}

module.exports = routes;
// For testing
module.exports.querySites = querySites;
module.exports.response = response;
