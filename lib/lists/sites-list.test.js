'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  elastic = require('../services/elastic'),
  FAKE_SITE = {
    name: 'Cool Site',
    host: 'coolsite.com',
    path: '/sitepath',
    slug: 'site',
    assetDir: 'test/fixtures/fakeSite',
    assetPath: '',
    port: 3001,
    resolveMedia: jest.fn(),
    resolvePublishing: jest.fn()
  },
  FAKE_SUBSITE = {
    amphoraKey: 'site/subsites/subsite',
    subsite: 'subsite',
    name: 'Cool Subsite',
    host: 'coolsubsite.com',
    path: '/sitepath',
    slug: 'site',
    assetDir: 'test/fixtures/fakeSite',
    assetPath: '',
    port: 3001
  },
  sitesService = {
    sites: jest.fn().mockReturnValue({ site: FAKE_SITE, subsite: FAKE_SUBSITE })
  };

elastic.batch = jest.fn();
elastic.findIndexFromAlias = jest.fn();

describe(filename, () => {
  describe('create', () => {
    test('calls the batch function to create all entries in the sites index', () => {
      elastic.batch.mockResolvedValue();
      elastic.findIndexFromAlias.mockResolvedValue('sites');
      return lib.create(sitesService)
        .then(() => {
          expect(elastic.batch).toHaveBeenCalled();
        });
    });
  });

  describe('constructMediaPath', () => {
    test('calls the batch function to create all entries in the sites index', () => {
      const site = {
        host: 'foo.com',
        slug: 'foo',
        path: '',
        port: 443
      };

      expect(lib.constructMediaPath(site)).toBe('foo.com/media/sites/foo/');
    });
  });
});
