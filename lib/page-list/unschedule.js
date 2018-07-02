'use strict';
const h = require('highland'),
  utils = require('./utils'),
  userOrRobot = require('../services/clay-user'),
  { subscribe } = require('../streams');
var log = require('../services/log').setup({file: __filename});

subscribe('unschedulePage')
  .flatMap(data => h(onUnschedule(data)))
  .each(resp => {
    log('debug', `Page updated on unschedule: ${resp._id}`);
  });

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
