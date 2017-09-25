'use strict';

const clayLog = require('clay-log'),
  pkg = require('../../package.json');
var amphoraSearchLogInstance;

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

function setup(meta) {
  return clayLog.meta(meta, amphoraSearchLogInstance);
}

module.exports.setup = setup;
