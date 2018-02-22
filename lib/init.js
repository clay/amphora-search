'use strict';

const _ = require('lodash'),
  setup = require('./setup'),
  bluebird = require('bluebird'),
  es = require('./services/elastic'),
  { indexWithPrefix } = require('./services/elastic-helpers'),
  path = require('path'),
  files = require('nymag-fs'),
  acceptedIcons = ['icon.120x120.png', 'icon.180x180', 'icon.192x192.png'],
  pageList = require('./page-list/utils'),
  usersList = require('./users-list');

let log = require('./services/log').setup({file: __filename}),
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
  var port = site.port === 80 ? '' : `:${site.port}`; // TODO: Not sure if I like this. Maybe just include the port from the config?

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
    sites = setup.options.sites.sites(); // Grab the sites using the passed in options from setup

  SITES_INDEX = indexWithPrefix('sites'); // note: this is exported for page list

  _.each(sites, function (site) {
    var mediaDir = path.resolve(process.cwd(), site.assetDir, 'media', 'sites', site.slug),
      mediaDirFiles = files.getFiles(mediaDir),
      icons = _.intersection(acceptedIcons, mediaDirFiles); // https://lodash.com/docs/4.17.2#intersection

    ops.push({
      index: {
        _index: SITES_INDEX, // TODO: v1 should not be suffix. Need to figure out versioning
        _type: 'general',
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

/**
 * Add all the sites to the Sites index.
 *
 * @return {Promise}
 */
function onInit() {
  return es.batch(module.exports.generateSitesIndexOps())
    .then(() => {
      pageList.setPagesIndex();
      pageList.setSitesIndex(SITES_INDEX);
      usersList.setUsersIndex();
      log('debug', 'sites index populated');
    })
    .catch(err => {
      log('fatal', `${err.message}`, {
        stack: err.stack
      });
      return bluebird.reject(err);
    });
}

// For testing
function setSites(sitesObj) {
  setup.options.sites = sitesObj;
}

module.exports = onInit;
// For testing
module.exports.constructMediaPath = constructMediaPath;
module.exports.generateSitesIndexOps = generateSitesIndexOps;
module.exports.setSites = setSites;
module.exports.setLog = fakeLogger => { log = fakeLogger; };
