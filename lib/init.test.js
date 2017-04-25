'use strict';
/* eslint max-nested-callbacks:[2,5] */

const bluebird = require('bluebird'),
  sinon = require('sinon'),
  _ = require('lodash'),
  expect = require('chai').expect,
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  es = require('./services/elastic'),
  search = es,
  path = require('path');

describe(_.startCase(filename), function () {
  describe(filename, function () {
    var sandbox,
      sites =  {
        sites: _.noop
      };

    beforeEach(function () {
      sandbox = sinon.sandbox.create();

      sandbox.stub(es);
    });

    afterEach(function () {
      sandbox.restore();
    });

    describe('onInit', function () {
      it('calls the Elastic `batch` function', function () {
        sandbox.stub(lib, 'generateSitesIndexOps').returns([]);
        es.batch.returns(bluebird.resolve());

        return lib().then(() => {
          expect(es.batch.calledOnce).to.be.true;
        });
      });

      it('throws an error if the batch function rejects', function () {
        sandbox.stub(lib, 'generateSitesIndexOps').returns([]);
        es.batch.returns(bluebird.reject());

        expect(lib()).to.throw;
      });
    });

    describe('constructMediaPath', function () {
      const fn = lib[this.title],
        exampleSiteOne = {
          name: 'Cool Site',
          host: 'coolsite.com',
          path: '/sitepath',
          assetDir: 'public',
          assetPath: '/asset/path',
          port: 80,
          resolveMedia: _.noop,
          resolvePublishing: _.noop
        },
        exampleSiteTwo = {
          name: 'Cool Site',
          host: 'coolsite.com',
          path: '/sitepath',
          slug: 'verycool',
          assetDir: 'public',
          assetPath: '',
          port: 3001,
          resolveMedia: _.noop,
          resolvePublishing: _.noop
        };

      it('returns a path based off the assetPath', function () {
        expect(fn(exampleSiteOne)).to.equal('coolsite.com/sitepath/media/sites/asset/path/');
      });

      it('returns a path based off the slug', function () {
        expect(fn(exampleSiteTwo)).to.equal('coolsite.com:3001/sitepath/media/sites/verycool/');
      });
    });

    describe('generateSitesIndexOps', function () {
      const fn = lib[this.title];

      it('calls the `batch` function of the search service for each site', function () {
        sandbox.stub(sites, 'sites').returns({
          coolSite: {
            name: 'Cool Site',
            host: 'coolsite.com',
            path: '/',
            assetDir: 'public',
            assetPath: '/',
            slug: 'site',
            port: 80,
            resolveMedia: _.noop,
            resolvePublishing: _.noop
          }
        });
        sandbox.stub(path, 'resolve').returns('some/path/to/img');
        sandbox.stub(_, 'intersection').returns([]);
        search.batch.returns(Promise.resolve('save'));

        lib.setSites(sites);
        fn();
        expect(fn()).to.deep.equal([ { index: { _index: 'sites', _type: 'general', _id: 'site' } },
          { name: 'Cool Site',
            slug: 'site',
            host: 'coolsite.com',
            path: '/',
            port: 80,
            assetDir: 'public',
            assetPath: '/',
            mediaPath: 'coolsite.com//media/sites//',
            siteIcon: 'undefined'
          }
        ]);
      });
    });

  });
});
