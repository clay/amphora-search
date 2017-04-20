'use strict';

const _ = require('lodash'),
  bluebird = require('bluebird');

/**
 * Handle errors in the standard/generic way
 *
 * @param {object} res
 * @returns {function}
 */
function handleError(res) {
  return function (err) {
    res.send(error.stack);
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


module.exports.expectJSON = expectJSON;
