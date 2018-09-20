'use strict';

const clayLog = require('clay-log'),
  pkg = require('../../package.json');
var amphoraSearchLogInstance;

/**
 * Initialize the logger
 */
function init() {
  if (amphoraSearchLogInstance) {
    return;
  }

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

/**
 * Set the logger instance
 * @param {Object|Function} replacement
 */
function setLogger(replacement) {
  amphoraSearchLogInstance = replacement;
}

// Setup on first require
init();

module.exports.init = init;
module.exports.setup = setup;
module.exports.setLogger = setLogger;
