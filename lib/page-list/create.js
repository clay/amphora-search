'use strict';
const utils = require('./utils'),
  userOrRobot = require('../services/clay-user'),
  log = require('../services/log').setup({file: __filename});

/**
 * add pages to the page list index when they're created
 * @param  {string} uri
 * @param  {object} user
 * @returns {Promise}
 */
function onCreate({ uri, user }) {
  return utils.getSite(uri).then(function (slug) {
    const page = {
      createdAt: Date.now(),
      uri: uri,
      archived: false,
      published: false,
      scheduled: false,
      scheduledTime: null,
      publishTime: null,
      updateTime: null,
      firstPublishTime: null,
      url: '',
      title: '', // set by components
      authors: [], // set by components
      users: [], // actual user accounts who have edited this page
      history: [{ action: 'create', timestamp: new Date(), users: [userOrRobot(user)] }],
      siteSlug: slug
    };

    return utils.updatePage(uri, page);
  })
    .catch(err => {
      log('error', `Error creating page ${uri}: ${err.message}`, {stack: err.stack});
    });
}

module.exports = onCreate;
