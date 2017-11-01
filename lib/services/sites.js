'use strict';

const _ = require('lodash'),
  url = require('url'),
  setup = require('../setup');

/**
 * Find the proper site object using the sites service.
 *
 * @param  {String} key
 * @return {Object}
 */
function findSite(key) {
  var site = setup.options.sites.getSiteFromPrefix(key),
    parsedUrl;

  // If the site is not found from the prefix we need to
  // use the `host` value to find it.
  if (!site) {
    // Make sure it's prefixed with `//` so it can get parsed properly
    // (Usually a problem when working locally)
    key = _.includes(key, '//') ? key : `//${key}`;
    parsedUrl = url.parse(key, true, true);
    site = setup.options.sites.getSite(parsedUrl.host, '');
  }

  return site;
}

function getSiteBySlug(slug) {
  return setup.options.sites.getSiteBySlug(slug);
}

module.exports = findSite;
module.exports.getSiteBySlug = getSiteBySlug;
