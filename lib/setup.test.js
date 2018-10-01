'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  path = require('path'),
  es = require('./services/elastic'),
  fixturesPath = path.resolve('./test/fixtures'),
  state = require('./services/state');

es.validateIndices = jest.fn();
es.setup = jest.fn();

describe(filename, () => {
  describe('setup', () => {
    test('it does not load the handler and mappings loaders if the options to skip are declared', () => {
      es.validateIndices.mockResolvedValue();
      return lib({ skipMappings: true, skipHandlers: true })
        .then(() => {
          expect(state.mappings).toEqual({});
          expect(state.handlers).toEqual({});
        });
    });

    test('it sets `options` on the state', () => {
      es.validateIndices.mockResolvedValue();
      return lib({ option: true })
        .then(() => {
          expect(state.options).toEqual({ option: true });
        });
    });

    test('it defaults `options` to an empty object if one isn\'t passed in', () => {
      es.validateIndices.mockResolvedValue();
      return lib()
        .then(() => {
          expect(state.options).toEqual({});
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
      expect(state.handlers.fake._isMockFunction).toBeTruthy();
    });
  });

  describe('loadMappingConfiguration', () => {
    test('it loads mappings and their settings', () => {
      lib.loadMappingConfiguration(fixturesPath);
      expect(state.settings['test-with-settings']).toHaveProperty('settings');
    });
  });
});
