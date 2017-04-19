'use strict';

const _ = require('lodash'),
  express = require('express');

function setupRoutes(router) {
  // router instance
  var pathRouter = express.Router();
  // assume json or text for anything in request bodies
  pathRouter.use(require('body-parser').json({strict: true, type: 'application/json', limit: '50mb'}));
  // Add the `_search` routes to the pathRouter`
  require('./routes/search')(pathRouter);

  router.use('/_search', pathRouter);
}

module.exports = setupRoutes;
