'use strict';
const utils = require('./utils'),
  userOrRobot = require('../services/clay-user');

/**
 * set layout in list as published,
 * and unschedule in case it was already scheduled
 * @param  {string} uri
 * @param  {object} user
 * @returns {Promise}
 */
function onPublish({ uri, user }) {
  return utils.getLayout(uri).then(function (layout) {
    // first, unschedule if it was currently scheduled
    if (layout.scheduled) {
      layout.scheduled = false;
      layout.scheduleTime = null;
      layout.history.push({ action: 'unschedule', timestamp: new Date(), users: [userOrRobot(user)] });
    }

    // then publish
    layout.published = true;
    layout.publishTime = new Date();
    layout.firstPublishTime = layout.firstPublishTime || layout.publishTime;
    layout.history.push({ action: 'publish', timestamp: new Date(), users: [userOrRobot(user)] });

    return utils.updateLayout(uri, layout);
  }).catch(() => {
    // layout doesn't exist! create it and publish it
    return utils.getSite(uri).then((slug) => {
      const now = new Date(),
        layout = {
          createTime: now,
          uri: uri,
          published: true,
          scheduled: false,
          scheduleTime: null,
          publishTime: now,
          updateTime: now,
          firstPublishTime: now,
          updateUser: userOrRobot(user),
          title: '',
          history: [
            { action: 'create', timestamp: now, users: [userOrRobot(user)] },
            { action: 'publish', timestamp: now, users: [userOrRobot(user)] }
          ],
          siteSlug: slug
        };

      return utils.updateLayout(uri, layout);
    });
  });
}

module.exports = onPublish;
