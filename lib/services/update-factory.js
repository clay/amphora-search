'use strict';

const h = require('highland'),
  { findPageByUrlOrUri, updatePageListEntry } = require('../page-list');

/**
 * [errOrGood description]
 * @param  {[type]} body [description]
 * @return {[type]}      [description]
 */
function errOrGood(body) {
  if (!body || !body.url) {
    let err = new Error('`_pagelist` endpoint cannot update a page without a url');

    return err;
  }

  return body;
}

/**
 * [handleError description]
 * @param  {[type]} err [description]
 * @return {[type]}     [description]
 */
function handleError(err) {
  return h.of({ status: 'error', msg: err.message, code: 400 });
}

/**
 * [queryOrPass description]
 * @param  {[type]} arg [description]
 * @return {[type]}     [description]
 */
function queryOrPass(arg) {
  if (arg instanceof Error) return handleError(arg);

  return query(arg);
}

/**
 * [query description]
 * @param  {[type]} url   [description]
 * @param  {[type]} value [description]
 * @return {[type]}       [description]
 */
function query({ url, value }) {
  return h(
    findPageByUrlOrUri(url)
      .then(updatePageListEntry(value))
      .then(function () {
        return { status: 'success', code: 200 };
      })
  );
}

/**
 * [update description]
 * @param  {[type]} body [description]
 * @return {[type]}      [description]
 */
function update(body) {
  return h.of(body)
    .map(errOrGood)
    .flatMap(queryOrPass);
}

module.exports = update;
