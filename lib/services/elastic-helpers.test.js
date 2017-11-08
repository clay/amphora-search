'use strict';
/* eslint max-nested-callbacks:[2,5] */

const sinon = require('sinon'),
  _ = require('lodash'),
  expect = require('chai').expect,
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  setup = require('../setup');

describe(_.startCase(filename), function () {
  describe(filename, function () {
    var sandbox, logFn,
      db = { get: _.noop, put: _.noop },
      FAKE_MAPPING = {
        myIndex: {
          general: {
            dynamic: false,
            properties: {
              propertyName: { type: 'string', index: 'analyzed' },
              otherProperty: { type: 'object', index: 'analyzed' },
              oneMoreProperty: { type: 'date' },
              lastProperty: { type: 'number', index: 'analyzed' } // Not supported in normalizeOpValuesWithMapping to test an `else`
            }
          }
        }
      };

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
      logFn = sandbox.stub();
      sandbox.stub(db, 'get');
      sandbox.stub(db, 'put');
      setup.mappings = FAKE_MAPPING;
      lib.setLog(logFn);
    });

    afterEach(function () {
      sandbox.restore();
      setup.mappings = {};
    });

    describe('stripPrefix', function () {
      const fn = lib[this.title];

      it('removes a prefix if one exists', function () {
        setup.prefix = 'test';

        expect(fn('test_index')).to.equal('index');
        setup.prefix = '';
      });
    });

    describe('indexWithPrefix', function () {
      const fn = lib[this.title];

      it('adds a prefix if one exists', function () {
        setup.prefix = ' test';

        expect(fn('index')).to.equal('test_index');
        setup.prefix = '';
      });
    });

    describe('convertRedisBatchtoElasticBatch', function () {
      var fn = lib[this.title];

      it('returns an array of ops if type property equals "put" with a JSON string', function () {
        var ops = [{ value: '{}', type: 'put' }];

        expect(fn({index: 'index', type: 'type', ops: ops})).to.deep.equal([{ index: { _index: 'index', _type: 'general' } }, {}]);
      });

      it('returns an array of ops if type property equals "put" with a JS object', function () {
        var ops = [{ value: {}, type: 'put' }];

        expect(fn({index: 'index', type: 'type', ops: ops})).to.deep.equal([{ index: { _index: 'index', _type: 'general' } }, {}]);
      });

      it('assigns a "key" property if one is defined in the op', function () {
        var ops = [{ value: '{}', type: 'put', key: 'key' }];

        expect(fn({index: 'index', type: 'type', ops: ops})).to.deep.equal([{ index: { _id: 'key', _index: 'index', _type: 'general' } }, {}]);
      });

      it('assigns a "key" property if one is defined in the op', function () {
        var ops = [{ value: '{}', type: 'get', key: 'key' }];

        expect(fn({index: 'index', type: 'type', ops: ops})).to.deep.equal([]);
      });

      it('allows for update', function () {
        var ops = [{ value: '{}', type: 'put', key: 'key' }];

        expect(fn({index: 'index', type: 'type', ops: ops, action: 'update'})).to.deep.equal([{ update: { _id: 'key', _index: 'index', _type: 'general', _retry_on_conflict: 3 } }, {doc: {}, doc_as_upsert: false}]);
      });

      it('allows for update with upsert', function () {
        var ops = [{ value: '{}', type: 'put', key: 'key' }];

        expect(fn({index: 'index', type: 'type', ops: ops, action: 'update', docAsUpsert: true})).to.deep.equal([{ update: { _id: 'key', _index: 'index', _type: 'general', _retry_on_conflict: 3 } }, {doc: {}, doc_as_upsert: true}]);
      });

      it('allows for delete', function () {
        var ops = [{ value: '{}', type: 'put', key: 'key' }];

        expect(fn({index: 'index', type: 'type', ops: ops, action: 'delete'})).to.deep.equal([{ delete: { _id: 'key', _index: 'index', _type: 'general' } }]);
      });

      it('allows for create', function () {
        var ops = [{ value: '{}', type: 'put', key: 'key' }];

        expect(fn({index: 'index', type: 'type', ops: ops, action: 'create'})).to.deep.equal([{ create: { _id: 'key', _index: 'index', _type: 'general' } }, {}]);
      });

      it('logs on unsupported action', function () {
        var ops = [{ value: '{}', type: 'put', key: 'key' }];

        fn({index: 'index', type: 'type', ops: ops, action: 'someUnsupportedAction'});
        sinon.assert.calledWith(logFn, 'error', 'Action someUnsupportedAction is not supported');
      });
    });

    describe('parseOpValue', function () {
      let fn = lib[this.title];

      it('throws an exception if an op\'s value isn\'t an object', function () {
        let op = {
          type: 'put',
          key: 'www.vulture.com/components/article/instances/section-test',
          value: 'this is a string'
        };

        expect(fn(op)).to.throw;
      });

      it('throws an exception if an op\'s value isn\'t a string', function () {
        let op = {
          type: 'put',
          key: 'www.vulture.com/components/article/instances/section-test',
          value: null
        };

        expect(fn(op)).to.throw;
      });
    });

    describe('convertObjectToString', function () {
      let fn = lib[this.title];

      it('returns the first property of an object if the property value is a string', function () {
        let value = { primaryHeadline: 'some headline' };

        expect(fn(value)).to.equal('some headline');
      });

      it('returns the first property of an object inside of an array if the value is a string', function () {
        let value = [{ primaryHeadline: 'some headline', canonicalUrl: 'blahblahblah' }];

        expect(fn(value)).to.deep.equal(['some headline']);
      });

      it('returns the property inside of an array if the value is a string', function () {
        let value = ['some headline'];

        expect(fn(value)).to.deep.equal(['some headline']);
      });

      it('returns string array inside of faked array (object has "items" property)', function () {
        let value = { items: [{ text: 'hey' }] };

        expect(fn(value)).to.deep.equal(['hey']);
      });

      it('throws an exception if the value is a bad string or [string] type', function () {
        let value = 123;

        expect(fn(value)).to.throw;
      });

      it('throws an exception if the array value is a bad string or [string] type', function () {
        let value = [['blah blah']];

        expect(fn(value)).to.throw;
      });
    });

    describe('normalizeOpValuesWithMapping', function () {
      let fn = lib[this.title];

      it('normalizes op with string type', function () {
        let op = [ { type: 'put',
            key: 'localhost.dev.nymag.biz/daily/intelligencer/components/article/instances/civzg5hje000kvurehqsgzcpy',
            value:
            { primaryHeadline: 'Blaming Clinton’s Base for Her Loss' } } ],
          result = [ { type: 'put',
            key: 'localhost.dev.nymag.biz/daily/intelligencer/components/article/instances/civzg5hje000kvurehqsgzcpy',
            value: { primaryHeadline: 'Blaming Clinton’s Base for Her Loss' } } ];

        fn('myIndex', op).then(function (data) {
          expect(JSON.stringify(data)).to.equal(JSON.stringify(result));
        });
      });

      it('normalizes op with object type', function () {
        let op = [ { type: 'put',
            key: 'localhost.dev.nymag.biz/daily/intelligencer/components/article/instances/civzg5hje000kvurehqsgzcpy',
            value: {feeds: {sitemaps: true, rss: true, newsfeed: true} }} ],
          result = [ { type: 'put',
            key: 'localhost.dev.nymag.biz/daily/intelligencer/components/article/instances/civzg5hje000kvurehqsgzcpy',
            value: {feeds: {sitemaps: true, rss: true, newsfeed: true} }} ];

        fn('myIndex', op).then(function (data) {
          expect(JSON.stringify(data)).to.equal(JSON.stringify(result));
        });
      });

      it('normalizes op with date type', function () {
        let op = [ { type: 'put',
            key: 'localhost.dev.nymag.biz/daily/intelligencer/components/article/instances/civzg5hje000kvurehqsgzcpy',
            value:
            { date: '2016-11-20' } } ],
          result = [ { type: 'put',
            key: 'localhost.dev.nymag.biz/daily/intelligencer/components/article/instances/civzg5hje000kvurehqsgzcpy',
            value: { date: '2016-11-20' } } ];

        fn('myIndex', op).then(function (data) {
          expect(JSON.stringify(data)).to.equal(JSON.stringify(result));
        });
      });

      it('does not invoke a comparitor if the type does not exist', function () {
        let op = [ { type: 'put',
            key: 'localhost/sitename/components/foo/instances/xyz',
            value:
            { primaryHeadline: 'Blaming Clinton’s Base for Her Loss' } } ],
          result = [ { type: 'put',
            key: 'localhost/sitename/components/foo/instances/xyz',
            value: { primaryHeadline: 'Blaming Clinton’s Base for Her Loss' } } ];

        fn('myIndex', op).then(function (data) {
          expect(JSON.stringify(data)).to.equal(JSON.stringify(result));
        });
      });
    });

    describe('removeAllReferences', function () {
      let fn = lib[this.title];

      it('returns an operation without its refs', function () {
        let op = {
          type: 'put',
          key: 'www.vulture.com/components/article/instances/section-test',
          value: { _ref: 'localhost.dev.nymag.biz/daily/intelligencer/components/clay-paragraph/instances/civv4lklw000jjzp43yqr0a2n' }
        };

        expect(fn(op)).to.deep.equal({
          type: 'put',
          key: 'www.vulture.com/components/article/instances/section-test',
          value: {}
        });
      });
    });

    describe('applyOpFilters', function () {
      let fn = lib[this.title],
        batchOps = [{
          type: 'put',
          key: 'localhost/components/foo/instances/xyz',
          value: { propertyName:'' }
        }],
        func = function (ops) {
          return ops;
        };

      it('returns an operation without its refs', function () {
        return fn(batchOps, 'myIndex', func)
          .then(function (resp) {
            expect(resp).to.deep.equal(batchOps);
          });
      });
    });

    describe('resolveReferencesForPropertyOfStringType', function () {
      let fn = lib[this.title];

      it('removes an op if the value for the property is null or undefined', function () {
        let func = fn('content'),
          ops = [{
            type: 'put',
            key: 'localhost/components/foo/instances/xyz',
            value: { content: null }
          }, {
            type: 'put',
            key: 'localhost/components/foo/instances/qrx',
            value: { content: 'value' }
          }, {
            type: 'put',
            key: 'localhost/components/foo/instances/baz',
            value: { content: { _ref: 'localhost/components/baz/instances/foo'} }
          }],
          db = {
            get: _.noop
          };

        sandbox.stub(db);
        setup.setDB(db);
        setup.options.db.get.returns(Promise.resolve('{"content": "value"}'));
        return func(ops).then(function (resp) {
          expect(resp).to.deep.equal([{
            type: 'put',
            key: 'localhost/components/foo/instances/qrx',
            value: { content: 'value' }
          }, {
            type: 'put',
            key: 'localhost/components/foo/instances/baz',
            value: { content: 'value' }
          }]);
        });
      });
    });
  });
});
