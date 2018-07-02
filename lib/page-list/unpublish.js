'use strict';

const h = require('highland'),
  utils = require('./utils'),
  userOrRobot = require('../services/clay-user'),
  { subscribe } = require('../streams');
var log = require('../services/log').setup({file: __filename});

subscribe('unpublishPage')
  .flatMap(data => h(onUnpublish(data)))
  .each(resp => {
    log('debug', `Page updated on unpublish: ${resp._id}`);
  });

/**
 * set page in list as unpublished
 * @param  {string} uri
 * @param  {object} user
 * @returns {Promise}
 */
function onUnpublish({ uri, user }) {
  return utils.getPage(uri).then(function (page) {
    page.published = false;
    page.publishTime = null;
    page.firstPublishTime = page.firstPublishTime || null;
    page.url = '';
    page.history.push({ action: 'unpublish', timestamp: new Date(), users: [userOrRobot(user)] });

    return utils.updatePage(uri, page);
  });
}

module.exports = onUnpublish;
