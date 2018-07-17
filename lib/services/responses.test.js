// 'use strict';

// const _ = require('lodash'),
//   h = require('highland'),
//   filename = __filename.split('/').pop().split('.').shift(),
//   lib = require('./' + filename),
//   expect = require('chai').expect,
//   sinon = require('sinon'),
//   createRes = require('../../test/mocks/res'),
//   streamRes = require('../../test/mocks/resStream'),
//   setup = require('../setup');

// describe(_.startCase(filename), function () {
//   let sandbox;

//   beforeEach(function () {
//     sandbox = sinon.sandbox.create();
//     setup.options.sites.getSiteFromPrefix = _.noop;
//     sandbox.stub(setup.options.sites);
//   });

//   afterEach(function () {
//     sandbox.restore();
//   });

//   /**
//    * Shortcut
//    *
//    * @param {object} res
//    * @param {object} expected
//    * @param {Function} finish
//    */
//   function expectResult(res, expected, finish) {
//     res
//       .each(function (result) {
//         expect(result).to.deep.equal(expected);
//       })
//       .done(() => {
//         finish();
//       });
//   }

//   describe('expectJSON', function () {
//     const fn = lib[this.title],
//       func = sinon.stub(),
//       res = {
//         json: _.noop,
//         send: _.noop,
//         status: _.noop
//       };

//     it('sends back JSON when the function resolves', function () {
//       const resolution = {prop: 'value'};

//       func.returns(Promise.resolve(resolution));
//       sandbox.stub(res, 'json');
//       fn(func, res);
//       expect(res.json.calledWith(resolution));
//     });

//     it('errors', function () {
//       const resolution = new Error('An error occured');

//       func.returns(Promise.reject(resolution));
//       sandbox.stub(res, 'send');
//       fn(func, res);
//       expect(res.send.calledWith(resolution.stack));
//     });

//     it('errors with custom code', function () {
//       const resolution = new Error('An error occured');

//       resolution.code = 400;
//       func.returns(Promise.reject(resolution));
//       sandbox.stub(res, 'send');
//       sandbox.stub(res, 'status').returns(res);
//       fn(func, res);
//       expect(res.status.calledWith(400));
//     });
//   });


//   describe('redirectToLogin', function () {
//     const fn = lib[this.title];

//     it('calls res.redirect', function () {
//       const res = createRes();

//       setup.options.sites.getSiteFromPrefix.returns({prefix: 'site.com', port: 3001});
//       fn({uri: 'site.com/path/_search'}, res);
//       expect(res.redirect.calledOnce).to.be.true;
//     });

//     it('uses port 80 if one is not defined', function () {
//       const res = createRes();

//       setup.options.sites.getSiteFromPrefix.returns({prefix: 'site.com'});
//       fn({uri: 'site.com/path/_search'}, res);
//       expect(res.redirect.calledOnce).to.be.true;
//     });
//   });

//   describe('streamOperation', function () {
//     const fn = lib[this.title],
//       success = { code: 200, status: 'success'},
//       error = { code: 400, status: 'error', msg: 'some msg'};

//     it('streams a success response to the client', function (done) {
//       const res = streamRes(),
//         operation = h.of(success);

//       expectResult(res, JSON.stringify(success), done);
//       fn(operation)(res);
//     });

//     it('streams an error response to the client', function (done) {
//       const res = streamRes(),
//         operation = h.of(error);

//       expectResult(res, JSON.stringify(error), done);
//       fn(operation)(res);
//     });
//   });
// });
