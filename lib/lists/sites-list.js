'use strict';

const _ = require('lodash'),
  es = require('../services/elastic'),
  { indexWithPrefix } = require('../services/elastic-helpers'),
  path = require('path'),
  files = require('amphora-fs'),
  acceptedIcons = ['icon.120x120.png', 'icon.180x180', 'icon.192x192.png'];

let log = require('../services/log').setup({file: __filename}),
  SITES_INDEX;

/**
 * Create the path to the media directory
 * for a site
 *
 * @param  {Object} site
 * @return {String}
 */
function constructMediaPath(site) {
  // For local development we want the user defined port
  var port = (site.port === 80 || site.port === 443) ? '' : `:${site.port}`;

  // Some sites, if they not in subdirectories of a main site, will not
  // have an asset path. If no asset path then just use the site slug.
  return `${site.host}${port}${site.path}/media/sites/${site.slug}/`;
}

/**
 * Populate the internal sites index with all the
 * sites included in the instance.
 *
 * @return {Promise}
 */
function generateSitesIndexOps() {
  var ops = [], // To be populated with Elastic ops for each site
    sites = sitesService.sites(); // Grab the sites using the passed in options from setup

  SITES_INDEX = indexWithPrefix('sites'); // note: this is exported for page list

  _.each(sites, function (site) {
    var mediaDir = path.resolve(process.cwd(), site.assetDir, 'media', 'sites', site.slug),
      mediaDirFiles = files.getFiles(mediaDir),
      icons = _.intersection(acceptedIcons, mediaDirFiles); // https://lodash.com/docs/4.17.2#intersection

    ops.push({
      index: {
        _index: SITES_INDEX,
        _type: '_doc',
        _id: site.slug
      }
    }, {
      name: site.name,
      slug: site.slug,
      host: site.host,
      path: site.path,
      port: site.port,
      protocol: site.protocol,
      assetDir: site.assetDir,
      assetPath: site.assetPath,
      mediaPath: `${constructMediaPath(site)}`,
      siteIcon: `${icons[0]}`
    });
  });

  return ops;
}

function createSitesList(sitesService) {
  return Promise.resolve();
}

module.exports = createSitesList;