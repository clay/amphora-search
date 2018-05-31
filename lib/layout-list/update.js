'use strict';
const _ = require('lodash'),
  utils = require('./utils'),
  userOrRobot = require('../services/clay-user');


/**
 * validate requests coming into _layoutlist
 * @param  {string} uri
 * @param  {object} data
 */
function validateRequest(uri, data) {
  if (!uri || !data) {
    let err = new Error('`_layoutlist` endpoint cannot update a layout without a uri and value');

    err.code = 400;
    throw err;
  }
}

/**
 * update the layout if it already exists in the layouts list
 * @param {string} uri
 * @param {object} data
 * @param {object} user
 * @return {Promise} layout entry, after adding those properties
 */
function update({ uri, data, user }) {
  validateRequest(uri, data);

  return utils.getLayout(uri).then((layout) => {
    const updatedLayout = _.assign(layout, _.pick(data, [
      // note: createTime/siteSlug/uri are never changed after creation
      'published',
      'scheduled',
      'scheduleTime',
      'publishTime',
      'updateTime',
      'firstPublishTime',
      'updateUser',
      'title',
      'history'
    ]));

    return utils.updateLayout(uri, updatedLayout).then(() => ({ uri: uri, value: updatedLayout }));
  }).catch(() => {
    const createAction = { action: 'create', timestamp: new Date(), users: [userOrRobot(user)] };

    // layout doesn't exist! create it
    /* eslint-disable */
    return utils.getSite(uri).then(function (slug) {
      const layout = {
        createTime: new Date(),
        uri: uri,
        published: data.published || false,
        scheduled: data.scheduled || false,
        scheduleTime: data.scheduleTime || null,
        publishTime: data.publishTime || null,
        updateTime: data.updateTime || null,
        firstPublishTime: data.firstPublishTime || null,
        updateUser: data.updateUser || userOrRobot(user),
        title: data.title || '',
        history: data.history && data.history.length ? [createAction].concat(data.history) : [createAction],
        siteSlug: slug
      };

      return utils.updateLayout(uri, layout).then(() => ({ uri: uri, value: layout }));
    });
    /* eslint-enable */
  });
}

module.exports.update = update; // not default export, so we can mock it to test _layoutlist route
