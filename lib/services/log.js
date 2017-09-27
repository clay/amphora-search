'use strict';

const clayLog = require('clay-log'),
  pkg = require('../../package.json');
var amphoraSearchLogInstance;

/**
 * Initialize the logger
 */
function init() {
  // Initialize the logger
  clayLog.init({
    name: 'amphora-search',
    prettyPrint: true,
    meta: {
      amphoraSearchVersion: pkg.version
    }
  });

  // Store the instance
  amphoraSearchLogInstance = clayLog.getLogger();
}

/**
 * Setup new logger for a file
 *
 * @param  {Object} meta
 * @return {Function}
 */
function setup(meta) {
  return clayLog.meta(meta, amphoraSearchLogInstance);
}

// Setup on first require
amphoraSearchLogInstance ? undefined : init();

module.exports.init = init;
module.exports.setup = setup;
