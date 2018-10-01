'use strict';

const bluebird = require('bluebird'),
  urlParse = require('url'),
  state = require('../services/state');
var log = require('../services/log').setup({file: __filename});

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

  if (parts.port && parts.port.toString() === '80') {
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

  return `${base}auth/login`;
}

/**
 * Handle errors in the standard/generic way
 *
 * @param {object} res
 * @returns {function}
 */
function handleError(res) {
  return function (err) {
    if (err.code) {
      res.status(err.code).send(err.stack);
    } else {
      res.send(err.stack);
    }
  };
}

/**
 * If a user is not authenticated let's re-direct to the login page.
 *
 * // TODO: PROPER SITES SERVICE REFERENCE
 * @param  {Object} req
 * @param  {Object} res
 */
function redirectToLogin(req, res) {
  res.redirect(getAuthUrl(state.options.sites.getSiteFromPrefix(req.uri)));
}

/**
 * Respond with JSON and capture
 *
 * Captures and hides appropriate errors.
 *
 * These return JSON always, because these endpoints are JSON-only.
 * @param {function} fn
 * @param {object} res
 * @returns {Promise}
 */
function expectJSON(fn, res) {
  return bluebird.try(fn).then(result => {
    res.json(result);
  }).catch(handleError(res));
}

/**
 * Given a stream which processes an operation,
 * send it to the client.
 *
 * - Operation streams should resolve a JSON object with
 *    - Status
 *    - Code
 * - If an error, the object can also contain a `msg` property to be sent back
 *
 * @param  {Stream} stream
 * @return {Function}
 */
function streamOperation(stream) {
  return function (res) {
    // Assuming JSON
    res.type('json');

    stream
      .doto(function (val) {
        if (val.code !== 200) {
          res.status(val.code);
          log('error', val.msg);
        }
      })
      .map(JSON.stringify)
      .pipe(res);
  };
}

module.exports.streamOperation = streamOperation;
module.exports.expectJSON = expectJSON;
module.exports.redirectToLogin = redirectToLogin;

// For testing
module.exports.getAuthUrl = getAuthUrl;
