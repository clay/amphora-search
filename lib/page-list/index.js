'use strict';
const h = require('highland'),
  db = require('../db'),
  utils = require('./utils'),
  { isLayout } = require('clayutils'),
  { subscribe } = require('../streams');
var log = require('../services/log').setup({file: __filename});

// subscribe('createPage')
//   .map(handleEvent)
//   .merge()
//   .map(updateElastic)
//   .merge()
//   .each(h.log)

// subscribe('publishPage')

subscribe('saveMeta')
  .map(handleEvent)
  .merge()
  .each(h.log);

function handleEvent({ uri, data }) {
  const promise = isLayout(uri) ? Promise.resolve('is a layout') : utils.updatePage(uri, data);

  return h(promise);
}

// function updateElastic({ uri, data }) {
//   return h(utils.updatePage(uri, data));
// }
