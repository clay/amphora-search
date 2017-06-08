'use strict';

const _ = require('lodash'),
  bluebird = require('bluebird'),
  urlParse = require('url'),
  setup = require('../setup');

/**
 * Take the protocol and port from a sourceUrl and apply them to some uri
 * @param {string} uri
 * @param {string} [protocol]
 * @param {string} [port]
 * @returns {string}
 */
function uriToUrl(uri, protocol, port) {
  // just pretend to start with http; it's overwritten two lines down
  const parts = urlParse.parse('http://' + uri);

  parts.protocol = protocol || 'http';
  parts.port = port || 80;
  delete parts.host;

  if (parts.protocol === 'http' && parts.port && parts.port.toString() === '80') {
    delete parts.port;
  }

  return parts.format();
}


/**
 * get the proper /auth url for a site
 * note: needs to add/not add initial slash, depending on the site path
 * @param {object} site
 * @returns {string}
 */
function getAuthUrl(site) {
  var base = uriToUrl(site.prefix, null, site.port);

  return _.last(base) === '/' ? `${base}auth/login` : `${base}/auth/login`;
}

/**
 * Handle errors in the standard/generic way
 *
 * @param {object} res
 * @returns {function}
 */
function handleError(res) {
  return function (err) {
    res.send(err.stack);
  };
}

/**
 * If a user is not authenticated let's re-direct to the login page.
 *
 * @param  {Object} req
 * @param  {Object} res
 */
function redirectToLogin(req, res) {
  res.redirect(getAuthUrl(setup.options.sites.getSiteFromPrefix(req.uri)));
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
module.exports.redirectToLogin = redirectToLogin;
