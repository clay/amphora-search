'use strict';
const utils = require('./utils');

/**
 * set page in list as unpublished
 * @param  {string} uri
 * @param  {object} user
 */
function onUnpublish({ uri, user }) {
  utils.getPage(uri).then(function (page) {
    page.published = false;
    page.publishTime = null;
    page.firstPublishTime = page.firstPublishTime || null;
    page.url = '';
    page.history.push({ action: 'unpublish', timestamp: new Date(), users: [utils.userOrRobot(user)] });

    utils.updatePage(uri, page);
  });
}

module.exports = onUnpublish;
