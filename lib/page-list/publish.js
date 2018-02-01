'use strict';
const utils = require('./utils');

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
    page.firstPublishTime = page.firstPublishTime || new Date();
    page.url = data.url;
    page.history.push({ action: 'publish', timestamp: new Date(), users: [utils.userOrRobot(user)] });

    return utils.updatePage(uri, page);
  });
}

module.exports = onPublish;
