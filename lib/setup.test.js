'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  path = require('path'),
  es = require('./services/elastic'),
  fixturesPath = path.resolve('./test/fixtures');

es.validateIndices = jest.fn();
es.setup = jest.fn();

describe(filename, () => {
  describe('setup', () => {
    test('it does not load the handlers and mappings if the options to skip is declared', () => {
      es.validateIndices.mockResolvedValue();
      return lib({ skipMappings: true, skipHandlers: true })
        .then(() => {
          expect(lib.mappings).toEqual({});
          expect(lib.handlers).toEqual({});
        });
    });

    test('it attaches `options` object and `prefix` string to `module.exports`', () => {
      es.validateIndices.mockResolvedValue();
      return lib({})
        .then(() => {
          expect(lib).toHaveProperty('options');
          expect(lib).toHaveProperty('prefix');
        });
    });

    test('it defaults `options` to an empty object if one isn\'t passed in', () => {
      es.validateIndices.mockResolvedValue();
      return lib()
        .then(() => {
          expect(lib).toHaveProperty('options');
          expect(lib).toHaveProperty('prefix');
        });
    });

    test('on the second pass it does not try to re-run index validaton', () => {
      lib({})
        .then(() => lib({}))
        .then(() => {
          expect(es.validateIndices).toHaveBeenCalledTimes(1);
        });
    });
  });

  describe('loadHandlers', () => {
    test('it loads handlers', () => {
      lib.loadHandlers(fixturesPath);
      expect(lib.handlers.fake._isMockFunction).toBeTruthy();
    });
  });

  describe('loadMappingConfiguration', () => {
    test('it loads mappings and their settings', () => {
      lib.loadMappingConfiguration(fixturesPath);
      expect(lib.settings['test-with-settings']).toHaveProperty('settings');
    });
  });
});
