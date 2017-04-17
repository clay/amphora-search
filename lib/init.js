'use strict';

const _ = require('lodash'),
  setup = require('./setup'),
  es = require('./services/elastic'),
  path = require('path'),
  files = require('nymag-fs'),
  log = require('./services/log').withStandardPrefix(__dirname), // TODO: PASS IN LOGGER?
  acceptedIcons = ['icon.120x120.png', 'icon.180x180', 'icon.192x192.png'],  // TODO: DOUBLE-CHECK ICONS
  PREFIX = process.env.ELASTIC_PREFIX ? `${process.env.ELASTIC_PREFIX}-` : '', // TODO: ENVIRONMENT VARIABLE OR PASSED IN VALUE?
  PAGES_INDEX = `${PREFIX}pages`,
  SITES_INDEX = `${PREFIX}sites`;

/**
 * Create the path to the media directory
 * for a site
 *
 * @param  {Object} site
 * @return {String}
 */
function constructMediaPath(site) {
  // For local development we want the user defined port
  var port = site.port === 80 ? '' : ':' + site.port;

  // Some sites, if they not in subdirectories of a main site, will not
  // have an asset path. If no asset path then just use the site slug.
  return `${site.host}${port}${site.path}/media/sites${site.assetPath || '/' + site.slug}/`;
}


/**
 * Populate the internal sites index with all the
 * sites included in the instance.
 *
 * @return {Promise}
 */
function generateSitesIndexOps() {
  var ops = [], // To be populated with Elastic ops for each site
    sites = setup.options.sites.sites(); // Grab the sites using the passed in options from setup

  _.each(sites, function (site) {
    var mediaDir = path.resolve(process.cwd(), site.assetDir, 'media', 'sites', site.slug),
      mediaDirFiles = files.getFiles(mediaDir),
      icons = _.intersection(acceptedIcons, mediaDirFiles); // https://lodash.com/docs/4.17.2#intersection

    ops.push({
      index: {
        _index: 'sites_v1', // TODO: v1 should not be suffix. Need to figure out versioning
        _type: 'general',
        _id: site.slug
      }
    }, {
      name: site.name,
      slug: site.slug,
      host: site.host,
      path: site.path,
      port: site.port,
      assetDir: site.assetDir,
      assetPath: site.assetPath,
      mediaPath: `${constructMediaPath(site)}`,
      siteIcon: `${icons[0]}`
    });
  });

  return ops;
}

/**
 * Add all the sites to the Sites index.
 *
 * @return {Promise}
 */
function onInit() {
  return es.batch(generateSitesIndexOps())
    .then(resp => {
      log('info', 'sites index populated');
    })
    .catch(err => {
      throw err;
    });
}

module.exports = onInit;
