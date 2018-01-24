'use strict';
const utils = require('./utils');

/**
 * set page in list as unscheduled
 * @param  {string} uri
 * @param  {object} user
 */
function onUnschedule({ uri, user }) {
  utils.getPage(uri).then(function (page) {
    page.scheduled = false;
    page.scheduledTime = null;
    page.history.push({ action: 'unschedule', timestamp: new Date(), users: [utils.userOrRobot(user)] });

    utils.updatePage(uri, page);
  });
}

module.exports = onUnschedule;
