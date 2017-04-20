'use strict';

const bluebird = require('bluebird'),
  elastic = require('../services/elastic');

/**
 * Handle errors in the standard/generic way
 * TODO: Handle errors
 * @param {object} res
 * @returns {function}
 */
function handleError(res) {
  return function (err) {
    // TODO: Send back proper error
    console.log(err);
  };
}

/**
 * Respond with JSON and capture
 *
 * Captures and hides appropriate errors.
 *
 * These return JSON always, because these endpoints are JSON-only.
 * @param {function} fn
 * @param {object} res
 */
function expectJSON(fn, res) {
  bluebird.try(fn).then(function (result) {
    res.json(result);
  }).catch(handleError(res));
}

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
  expectJSON(elasticPassthrough(req.body), res);
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
}

module.exports = routes;
