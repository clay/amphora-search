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
      return expect(
        lib({ skipMappings: true, skipHandlers: true })
          .then(() => ({ handlers: state.handlers, mappings: state.mappings }))
      ).resolves.toEqual({ handlers: {}, mappings: {} });
    });

    test('it sets `options` on the state', () => {
      es.validateIndices.mockResolvedValue();
      return expect(
        lib({ option: true })
          .then(() => state.options)
      ).resolves.toEqual({ option: true });
    });

    test('it defaults `options` to an empty object if one isn\'t passed in', () => {
      es.validateIndices.mockResolvedValue();
      return expect(lib().then(() => state.options)).resolves.toEqual({});
    });

    test('on the second pass it does not try to re-run index validaton', () => {
      return expect(
        lib({})
          .then(() => lib({}))
          .then(() => es.validateIndices)
      ).resolves.toHaveBeenCalledTimes(1);
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
