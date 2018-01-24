'use strict';
const utils = require('./utils');

/**
 * add pages to the page list index when they're created
 * @param  {string} uri
 * @param  {object} user
 */
function onCreate({ uri, user }) {
  utils.getSite(uri).then(function (slug) {
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
      history: [{ action: 'create', timestamp: new Date(), users: [utils.userOrRobot(user)] }],
      siteSlug: slug
    };

    utils.updatePage(uri, page);
  });
}

module.exports = onCreate;
