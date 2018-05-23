'use strict';
const utils = require('./utils'),
  userOrRobot = require('../services/clay-user');

/**
 * set page in list as scheduled
 * @param  {string} uri
 * @param  {object} data
 * @param  {object} user
 * @returns {Promise}
 */
function onSchedule({ uri, data, user }) {
  return utils.getPage(uri).then(function (page) {
    page.scheduled = true;
    page.scheduledTime = utils.utcDate(data.at);
    page.history.push({ action: 'schedule', timestamp: new Date(), users: [userOrRobot(user)] });

    return utils.updatePage(uri, page);
  });
}

module.exports = onSchedule;
