'use strict';

const h = require('highland'),
  pageList = require('../page-list');

/**
 * Test the request body for a url property.
 *
 * @param  {Object} body
 * @return {Object}
 */
function validateBody(body) {
  if (!body || !body.url) {
    let err = new Error('`_pagelist` endpoint cannot update a page without a url');

    err.code = 400;
    return err;
  }

  return body;
}

/**
 * Format an error message
 *
 * @param  {Error} err
 * @return {Object}
 */
function handleError({ message, code }) {
  return { status: 'error', msg: message, code };
}

/**
 * If Error, handle it, if all good, run a query.
 *
 * @param  {Error|Object} arg
 * @return {Stream}
 */
function queryOrPass(arg) {
  if (arg instanceof Error) return h.of(handleError(arg));

  return query(arg);
}

/**
 * Update the page list document
 *
 * @param  {String} url
 * @param  {Object} value
 * @return {Stream}
 */
function query({ url, value }) {
  return h(
    pageList.findPageByUrlOrUri(url)
      .then(pageList.updatePageListEntry(value))
      .then(function () {
        return { status: 'success', code: 200 };
      })
      .catch(function (err) {
        err.code = 500;

        return handleError(err);
      })
  );
}

/**
 * Validate the request body, if it's valid then
 * update the Elastic document corresponding to the
 * page. Oherwise return an error object to send
 * to the client.
 *
 * @param  {Object} body
 * @return {Stream}
 */
function update(body) {
  return h.of(body)
    .map(validateBody)
    .flatMap(queryOrPass);
}

module.exports = update;

// For testing
module.exports.handleError = handleError;
