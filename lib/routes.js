'use strict';

const _ = require('lodash'),
  express = require('express'),
  files = require('amphora-fs'),
  path = require('path');

function setupRoutes(router) {
  const routesPath = 'routes';

  // load all controller routers
  _.each(files.getFiles([__dirname, routesPath].join(path.sep)), filename => {
    var pathRouter,
      name = removeExtension(filename),
      controller = files.tryRequire([__dirname, '.', routesPath, name].join(path.sep));

    // we're okay with an error occurring here because it means we're missing something important in a route
    pathRouter = express.Router();

    // assume json or text for anything in request bodies
    pathRouter.use(require('body-parser').json({strict: true, type: 'application/json', limit: '50mb'}));
    pathRouter.use(require('body-parser').text({type: 'text/*'}));

    controller(pathRouter);

    router.use('/' + name, pathRouter);
  });
}

/**
 * Remove extension from route / path.
 * @param {string} path
 * @returns {string}
 */
function removeExtension(path) {
  let leadingDot, endSlash = path.lastIndexOf('/');

  if (endSlash > -1) {
    leadingDot = path.indexOf('.', endSlash);
  } else {
    leadingDot = path.indexOf('.');
  }

  if (leadingDot > -1) {
    path = path.substr(0, leadingDot);
  }
  return path;
}

module.exports = setupRoutes;
module.exports.removeExtension = removeExtension;
