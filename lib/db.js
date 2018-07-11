'use strict';

var db; // Assigned at init

function setupDb() {
  return db.query('CREATE SCHEMA IF NOT EXISTS search')
    .then(() => db.query('CREATE TABLE IF NOT EXISTS search."pages" ( id TEXT PRIMARY KEY NOT NULL, data JSONB );'))
    .then(() => db.query('CREATE TABLE IF NOT EXISTS search."layouts" ( id TEXT PRIMARY KEY NOT NULL, data JSONB );'));
}

function init(storage) {
  module.exports.db = db = storage;

  return setupDb();
}

module.exports = init;

// For testing
module.exports.setDb = mock => db = mock;
