'use strict';
const utils = require('./utils'),
  userOrRobot = require('../services/clay-user');

/**
 * set page in list as published
 * @param  {string} uri
 * @param  {object} data
 * @param  {object} user
 * @returns {Promise}
 */
function onPublish({ uri, data, user }) {
  return utils.getPage(uri).then(function (page) {
    page.published = true;
    page.publishTime = new Date();
    page.firstPublishTime = page.firstPublishTime || page.publishTime;
    page.url = data.url;
    page.history.push({ action: 'publish', timestamp: new Date(), users: [userOrRobot(user)] });

    return utils.updatePage(uri, page);
  });
}

module.exports = onPublish;
