'use strict';

const clayLog = require('clay-log'),
  pkg = require('../../package.json');

// Initialize the logger
clayLog.init({
  name: 'amphora-search',
  prettyPrint: true,
  version: pkg.version
});

function setup(meta) {
  return clayLog.meta(meta);
}

module.exports.setup = setup;
