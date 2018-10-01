'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  state = require('./state'),
  FAKE_MAPPING = {
    myIndex: {
      _doc: {
        dynamic: false,
        properties: {
          propertyName: { type: 'string', index: 'analyzed' },
          otherProperty: { type: 'object', index: 'analyzed' },
          oneMoreProperty: { type: 'date' },
          lastProperty: { type: 'number', index: 'analyzed' } // Not supported in normalizeOpValuesWithMapping to test an `else`
        }
      }
    }
  },
  logMock = jest.fn(),
  dbMock = {
    get: jest.fn(),
    put: jest.fn()
  };

beforeEach(() => {
  lib.setLog(logMock);
  lib.setDb({ db: dbMock });
  state.setMappings(FAKE_MAPPING);
});

describe(filename, () => {
  describe('stripPrefix', () => {
    const fn = lib.stripPrefix;

    test('removes a prefix if one exists', () => {
      expect(fn('test_index', 'test')).toBe('index');
    });
  });

  describe('indexWithPrefix', () => {
    const fn = lib.indexWithPrefix;

    test('adds a prefix if one exists', () => {
      expect(fn('index', 'test')).toBe('test_index');
    });
  });

  describe('convertOpValuesPropertyToString', () => {
    test('it calls `resolveReferencesForPropertyOfStringType`', () => {
      lib.resolveReferencesForPropertyOfStringType = jest.fn().mockResolvedValue();

      return lib.convertOpValuesPropertyToString('foo', [])
        .then(() => {
          expect(lib.resolveReferencesForPropertyOfStringType).toHaveBeenCalled();
        });
    });
  });

  describe('convertRedisBatchtoElasticBatch', () => {
    const executeTest = (arg, exp) => expect(lib.convertRedisBatchtoElasticBatch(arg)).toEqual(exp),
      opsSetOne = [{ value: '{}', type: 'put', key: 'key' }];

    test('returns an array of ops if type property equals "put" with a JSON string', () => {
      executeTest({index: 'index', type: 'type', ops: [{ value: '{}', type: 'put' }]}, [{ index: { _index: 'index', _type: '_doc' } }, {}]);
    });

    test('returns an array of ops if type property equals "put" with a JS object', () => {
      executeTest({index: 'index', type: 'type', ops: [{ value: {}, type: 'put' }]}, [{ index: { _index: 'index', _type: '_doc' } }, {}]);
    });

    test('assigns a "key" property if one is defined in the op', () => {
      executeTest({index: 'index', type: 'type', ops: opsSetOne}, [{ index: { _id: 'key', _index: 'index', _type: '_doc' } }, {}]);
    });

    test('assigns a "key" property if one is defined in the op', () => {
      executeTest({index: 'index', type: 'type', ops: [{ value: '{}', type: 'get', key: 'key' }]}, []);
    });

    test('allows for update', () => {
      executeTest({index: 'index', type: 'type', ops: opsSetOne, action: 'update'}, [{ update: { _id: 'key', _index: 'index', _type: '_doc', _retry_on_conflict: 3 } }, {doc: {}, doc_as_upsert: false}]);
    });

    test('allows for update with upsert', () => {
      executeTest({index: 'index', type: 'type', ops: opsSetOne, action: 'update', docAsUpsert: true}, [{ update: { _id: 'key', _index: 'index', _type: '_doc', _retry_on_conflict: 3 } }, {doc: {}, doc_as_upsert: true}]);
    });

    test('allows for delete', () => {
      executeTest({index: 'index', type: 'type', ops: opsSetOne, action: 'delete'}, [{ delete: { _id: 'key', _index: 'index', _type: '_doc' } }]);
    });

    test('allows for create', () => {
      executeTest({index: 'index', type: 'type', ops: opsSetOne, action: 'create'}, [{ create: { _id: 'key', _index: 'index', _type: '_doc' } }, {}]);
    });

    test('logs on unsupported action', () => {
      lib.convertRedisBatchtoElasticBatch({index: 'index', type: 'type', ops: opsSetOne, action: 'someUnsupportedAction'});
      expect(logMock).toHaveBeenCalledWith('error', 'Action someUnsupportedAction is not supported');
    });
  });

  describe('parseOpValue', () => {
    const fn = lib.parseOpValue;

    it('logs a warning if an op\'s value isn\'t an object', () => {
      fn({ type: 'put', key: 'www.vulture.com/_components/article/instances/section-test', value: 'this is a string' });

      expect(logMock).toHaveBeenCalledTimes(1);
    });

    it('logs a warning if an op\'s value isn\'t a string', () => {
      fn({ type: 'put', key: 'www.vulture.com/_components/article/instances/section-test', value: undefined});
      expect(logMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('convertObjectToString', () => {
    let fn = lib.convertObjectToString;

    test('returns the first property of an object if the property value is a string', () => {
      expect(fn({ primaryHeadline: 'some headline' })).toEqual('some headline');
    });

    test('returns the first property of an object inside of an array if the value is a string', () => {
      expect(fn([{ primaryHeadline: 'some headline', canonicalUrl: 'blahblahblah' }])).toEqual(['some headline']);
    });

    test('returns the property inside of an array if the value is a string', () => {
      expect(fn(['some headline'])).toEqual(['some headline']);
    });

    test('returns string array inside of faked array (object has "items" property)', () => {
      expect(fn({ items: [{ text: 'hey' }] })).toEqual(['hey']);
    });

    test('throws an exception if the value is a bad string or [string] type', () => {
      fn(123);
      expect(logMock).toHaveBeenCalledTimes(1);
    });

    test('throws an exception if the array value is a bad string or [string] type', () => {
      fn([['blah blah']]);
      expect(logMock).toHaveBeenCalledTimes(1);
    });
  });


  describe.each([
    [
      'normalizes op with string type',
      [ { type: 'put', key: 'localhost.dev.nymag.biz/daily/intelligencer/_components/article/instances/civzg5hje000kvurehqsgzcpy', value: { primaryHeadline: 'Blaming Clinton’s Base for Her Loss' } } ],
      [ { type: 'put', key: 'localhost.dev.nymag.biz/daily/intelligencer/_components/article/instances/civzg5hje000kvurehqsgzcpy', value: { primaryHeadline: 'Blaming Clinton’s Base for Her Loss' } } ]
    ],
    [
      'normalizes op with object type',
      [ { type: 'put', key: 'localhost.dev.nymag.biz/daily/intelligencer/_components/article/instances/civzg5hje000kvurehqsgzcpy', value: {feeds: {sitemaps: true, rss: true, newsfeed: true} }} ],
      [ { type: 'put', key: 'localhost.dev.nymag.biz/daily/intelligencer/_components/article/instances/civzg5hje000kvurehqsgzcpy', value: {feeds: {sitemaps: true, rss: true, newsfeed: true} }} ]
    ],
    [
      'normalizes op with date type',
      [ { type: 'put', key: 'localhost.dev.nymag.biz/daily/intelligencer/_components/article/instances/civzg5hje000kvurehqsgzcpy', value: { date: '2016-11-20' } } ],
      [ { type: 'put', key: 'localhost.dev.nymag.biz/daily/intelligencer/_components/article/instances/civzg5hje000kvurehqsgzcpy', value: { date: '2016-11-20' } } ]
    ],
    [
      'does not invoke a comparitor if the type does not exist',
      [ { type: 'put', key: 'localhost/sitename/_components/foo/instances/xyz', value: { primaryHeadline: 'Blaming Clinton’s Base for Her Loss' } } ],
      [ { type: 'put', key: 'localhost/sitename/_components/foo/instances/xyz', value: { primaryHeadline: 'Blaming Clinton’s Base for Her Loss' } } ]
    ]
  ])
  ('normalizeOpValuesWithMapping', (action, op, result) => {
    test(action, () => {
      return expect(lib.normalizeOpValuesWithMapping('myIndex', op)).resolves.toEqual(result);
    });
  });


  describe('removeAllReferences', () => {
    const fn = lib.removeAllReferences;

    test('returns an operation without its refs', () => {
      expect(fn({
        type: 'put',
        key: 'www.vulture.com/_components/article/instances/section-test',
        value: { _ref: 'localhost.dev.nymag.biz/daily/intelligencer/_components/clay-paragraph/instances/civv4lklw000jjzp43yqr0a2n' }
      })).toEqual({
        type: 'put',
        key: 'www.vulture.com/_components/article/instances/section-test',
        value: {}
      });
    });
  });

  describe('applyOpFilters', () => {
    let fn = lib.applyOpFilters,
      batchOps = [{
        type: 'put',
        key: 'localhost/_components/foo/instances/xyz',
        value: { propertyName:'' }
      }],
      func = ops => ops;

    test('returns an operation without its refs', () => {
      expect(fn(batchOps, 'myIndex', func)).resolves.toEqual(batchOps);
    });

    test('rejects if index is not supplied', () => {
      const errMsg = 'Suppliend index is undefined or not a string: undefined';

      return expect(fn(batchOps, undefined, func)).rejects.toHaveProperty('message', errMsg);
    });

    test('rejects if index is supplied but is not a string', () => {
      const errMsg = 'Suppliend index is undefined or not a string: 123';

      return expect(fn(batchOps, 123, func)).rejects.toHaveProperty('message', errMsg);
    });
  });

  describe('resolveReferencesForPropertyOfStringType', () => {
    const fn = lib.resolveReferencesForPropertyOfStringType;

    test('removes an op if the value for the property is null or 123', () => {
      const func = fn('content'),
        ops = [{
          type: 'put',
          key: 'localhost/_components/foo/instances/xyz',
          value: { content: null }
        }, {
          type: 'put',
          key: 'localhost/_components/foo/instances/qrx',
          value: { content: 'value' }
        }, {
          type: 'put',
          key: 'localhost/_components/foo/instances/baz',
          value: { content: { _ref: 'localhost/_components/baz/instances/foo'} }
        }];

      // sandbox.stub(db);
      // setup.setDB(db);
      dbMock.get.mockResolvedValue({ content: 'value' });
      // setup.options.db.get.returns(Promise.resolve('{"content": "value"}'));

      return expect(func(ops))
        .resolves
        .toEqual([{
          type: 'put',
          key: 'localhost/_components/foo/instances/qrx',
          value: { content: 'value' }
        }, {
          type: 'put',
          key: 'localhost/_components/foo/instances/baz',
          value: { content: 'value' }
        }]);
    });
  });
});
