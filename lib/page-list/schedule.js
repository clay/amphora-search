'use strict';

const h = require('highland'),
  utils = require('./utils'),
  userOrRobot = require('../services/clay-user'),
  { subscribe } = require('../streams');
var log = require('../services/log').setup({file: __filename});

subscribe('schedulePage')
  .flatMap(data => h(onSchedule(data)))
  .each(resp => {
    log('debug', `Page updated on schedule: ${resp._id}`);
  });

/**
 * set page in list as scheduled
 * @param  {string} uri
 * @param  {object} data
 * @param  {object} user
 * @returns {Promise}
 */
function onSchedule({ uri, data, user }) {
  return utils.getPage(uri).then(page => {
    page.scheduled = true;
    page.scheduledTime = utils.utcDate(data.at);
    page.history.push({ action: 'schedule', timestamp: new Date(), users: [userOrRobot(user)] });

    return utils.updatePage(uri, page);
  });
}

module.exports = onSchedule;
