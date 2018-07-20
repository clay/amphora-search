'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  logMock = jest.fn(),
  routesMock = jest.fn(),
  busMock = jest.fn(),
  setupMock = jest.fn(),
  listsMock = jest.fn();

beforeEach(() => {
  lib.setLog(logMock);
  lib.setSetup(setupMock);
  lib.setRoutes(routesMock);
  lib.setBus(busMock);
  lib.setLists(busMock);
});

describe(filename, () => {
  describe('onInit', () => {
    test('calls the Elastic `batch` function', () => {
      setupMock.mockResolvedValue(Promise.resolve());
      routesMock.mockResolvedValue();
      busMock.mockResolvedValue();
      listsMock.mockResolvedValue();

      return lib({})().then(() => {
        expect(setupMock).toHaveBeenCalled();
        expect(routesMock).toHaveBeenCalled();
        expect(busMock).toHaveBeenCalled();
      });
    });

    it('logs an error if the batch function rejects', () => {
      setupMock.mockResolvedValue(Promise.reject(new Error('foo')));

      return lib({})()
        .catch(err => {
          expect(err).toBeInstanceOf(Error);
          expect(err).toHaveProperty('message', 'foo');
          expect(logMock).toHaveBeenCalled();
        });
    });
  });
});

// describe(_.startCase(filename), () => {
//   describe(filename, () => {
//     var sandbox, logFn,
//       sites =  {
//         sites: _.noop
//       };

//     beforeEach () => {
//       sandbox = sinon.sandbox.create();
//       logFn = sandbox.stub();

//       sandbox.stub(es);
//       lib.setLog(logFn);
//     });

//     afterEach () => {
//       sandbox.restore();
//     });



//     describe('constructMediaPath', () => {
//       const fn = lib[this.title],
//         exampleSiteOne = {
//           name: 'Cool Site',
//           host: 'coolsite.com',
//           path: '/sitepath',
//           slug: 'verycool',
//           assetDir: 'public',
//           assetPath: '',
//           port: 3001,
//           resolveMedia: _.noop,
//           resolvePublishing: _.noop
//         };

//       it('returns a path based off the slug', () => {
//         expect(fn(exampleSiteOne)).to.equal('coolsite.com:3001/sitepath/media/sites/verycool/');
//       });
//     });

//     describe('generateSitesIndexOps', () => {
//       const fn = lib[this.title];

//       it('calls the `batch` function of the search service for each site', () => {
//         sandbox.stub(sites, 'sites').returns({
//           coolSite: {
//             name: 'Cool Site',
//             host: 'coolsite.com',
//             path: '',
//             assetDir: 'public',
//             assetPath: '/',
//             slug: 'site',
//             port: 80,
//             protocol: 'http',
//             resolveMedia: _.noop,
//             resolvePublishing: _.noop
//           }
//         });
//         sandbox.stub(path, 'resolve').returns('some/path/to/img');
//         sandbox.stub(_, 'intersection').returns([]);
//         search.batch.returns(Promise.resolve('save'));

//         lib.setSites(sites);

//         expect(fn()).to.deep.equal([ { index: { _index: 'sites', _type: '_doc', _id: 'site' } },
//           { name: 'Cool Site',
//             slug: 'site',
//             host: 'coolsite.com',
//             path: '',
//             port: 80,
//             protocol: 'http',
//             assetDir: 'public',
//             assetPath: '/',
//             mediaPath: 'coolsite.com/media/sites/site/',
//             siteIcon: 'undefined'
//           }
//         ]);
//       });
//     });

//   });
// });
