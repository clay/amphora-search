'use strict';
const utils = require('./utils'),
  userOrRobot = require('../services/clay-user');

/**
 * set page in list as unscheduled
 * @param  {string} uri
 * @param  {object} user
 * @returns {Promise}
 */
function onUnschedule({ uri, user }) {
  return utils.getPage(uri).then(function (page) {
    page.scheduled = false;
    page.scheduledTime = null;
    page.history.push({ action: 'unschedule', timestamp: new Date(), users: [userOrRobot(user)] });

    return utils.updatePage(uri, page);
  });
}

module.exports = onUnschedule;
