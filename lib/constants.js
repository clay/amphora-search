'use strict';

module.exports.BUS_NAMESPACE =  process.env.CLAY_BUS_NAMESPACE || 'clay';
module.exports.BUS_TOPICS = [
  'publishLayout',
  'publishPage',
  'unpublishPage',
  'createPage',
  'save',
  'delete',
  'deleteUser',
  'saveMeta',
  'saveUser'
];
