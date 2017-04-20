'use strict';

const bluebird = require('bluebird'),
  sinon = require('sinon'),
  _ = require('lodash'),
  expect = require('chai').expect,
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  files = require('nymag-fs'),
  es = require('./services/elastic');
  // setup = require('./setup');

describe(_.startCase(filename), function () {
  describe(filename, function () {
    var sandbox, setup = fakeSitesService();

    function fakeSitesService() {
      return {
        options: {
          sites: {
            sites: _.noop
          }
        }
      }
    }

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
        es.batch.returns(bluebird.resolve())

        return lib().then(() => {
            expect(es.batch.calledOnce).to.be.true;
          });
      });

      it('throws an error if the batch function rejects', function () {
        sandbox.stub(lib, 'generateSitesIndexOps').returns([]);
        es.batch.returns(bluebird.reject())


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

    //
    // describe('generateSitesIndexOps', function () {
    //   const fn = lib[this.title];
    //
    //   it('calls the `batch` function of the search service for each site', function () {
    //     setup.options.sites.sites.returns({
    //       coolSite: {
    //         name: 'Cool Site',
    //         host: 'coolsite.com',
    //         path: '/',
    //         assetDir: 'public',
    //         assetPath: '/',
    //         port: 80,
    //         resolveMedia: _.noop,
    //         resolvePublishing: _.noop
    //       }
    //     });
    //     sandbox.stub(path, 'resolve').returns('some/path/to/img');
    //     sandbox.stub(_, 'intersection').returns([]);
    //     search.batch.returns(Promise.resolve('save'));
    //
    //
    //     return fn()
    //       .then(function () {
    //         expect(search.batch.calledOnce).to.be.true;
    //       });
    //   });
    // });

  });
});
