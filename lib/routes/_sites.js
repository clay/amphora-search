'use strict';

const _ = require('lodash'),
  bluebird = require('bluebird'),
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
  // TODO: Test the body for security
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
  return elastic.query('sites', {}, 'general')
    .then((result) => _.get(result, 'hits.hits', []));
}

function routes(router) {
  router.get('/', response);
}

module.exports = routes;
