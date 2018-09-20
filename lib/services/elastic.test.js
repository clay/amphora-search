'use strict';

var filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  client = createFakeClientClass(),
  logMock = jest.fn();

/**
 * Create a fake elasticsearch client.
 * @returns {*}
 */
function createFakeClientClass() {
  return {
    bulk: jest.fn(),
    search: jest.fn(),
    msearch: jest.fn(),
    delete: jest.fn(),
    index: jest.fn(),
    ping: jest.fn(),
    search: jest.fn(),
    exists: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    cat: {
      aliases: jest.fn()
    },
    indices: {
      create: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      existsAlias: jest.fn(),
      existsMapping: jest.fn(),
      putAlias: jest.fn(),
      create: jest.fn(),
      getMapping: jest.fn(),
      putMapping: jest.fn(),
      putSettings: jest.fn(),
      close: jest.fn(),
      open: jest.fn()
    }
  };
}

beforeEach(() => {
  lib.setup(client);
  lib.setLog(logMock);
});

describe(filename, () => {
  describe('setup', () => {
    test('creates an Elastic client if an endpoint is defined and no override is passed in', () => {
      return expect(lib.setup()).rejects.toThrow();
    });

    test('returns an instance with fake client if one is passed in', () => {
      lib.setup(client);
      expect(lib.client).toEqual(client);
    });

    test('creates an Elastic client if an endpoint is defined and no override is passed in', () => {
      lib.endpoint = 'whatever';
      lib.setup();
      expect(lib.client).not.toEqual({});
    });
  });

  describe('healthCheck', () => {
    const fn = lib.healthCheck;

    test('pings unsuccessfully', () => {
      client.ping.mockRejectedValue(new Error('failed'));
      return expect(fn(client)).rejects.toBeInstanceOf(Error);
    });

    test('pings successfully', () => {
      client.ping.mockResolvedValue();
      return expect(fn(client)).resolves.toBeUndefined();
    });
  });

  describe('existsMapping', () => {
    const fn = lib.existsMapping;

    it('is called successfully', () => {
      client.indices.getMapping.mockResolvedValue(true);
      return expect(fn('index', 'type')).resolves.toBeTruthy();
    });
  });


  describe('initIndex', () => {
    const fn = lib.initIndex;

    test('is called successfully', () => {
      client.indices.create.mockResolvedValue(true);
      return fn('index', 'type')
        .then(() => {
          expect(logMock).toHaveBeenCalledTimes(1);
        });
    });

    test('handles error properly', () => {
      client.indices.create.mockRejectedValue(false);
      return fn('index', 'mappings')
        .catch(() => {
          expect(client.indices.create).toHaveBeenCalledTimes(1);
        });
    });

    test('uses and empty object if no settings are passed in', () => {
      client.indices.create.mockRejectedValue(false);
      return fn('index')
        .catch(() => {
          expect(client.indices.create).toHaveBeenCalledTimes(1);
        });
    });
  });

  describe('initAlias', () => {
    const fn = lib.initAlias;

    test('is called successfully', () => {
      client.indices.putAlias.mockResolvedValue(true);
      return fn('name', 'index')
        .then(() => {
          expect(client.indices.putAlias).toHaveBeenCalledTimes(1);
        });
    });

    test('handles error properly', () => {
      client.indices.putAlias.mockRejectedValue(false);
      return fn('name', 'index')
        .catch(() => {
          expect(client.indices.putAlias).toHaveBeenCalledTimes(1);
        });
    });
  });

  describe('initMapping', () => {
    const fn = lib.initMapping;

    test('is called successfully', () => {
      client.indices.putMapping.mockResolvedValue(true);
      return fn('name', 'index')
        .then(() => {
          expect(client.indices.putMapping).toHaveBeenCalledTimes(1);
        });
    });

    test('handles error properly', () => {
      client.indices.putMapping.mockRejectedValue(false);
      return fn('name', 'index')
        .catch(resp => {
          expect(resp).toBeFalsy();
        });
    });
  });

  describe('createAliasIfNone', () => {
    const fn = lib.createAliasIfNone;

    test('calls existsAlias successfully', () => {
      lib.existsAlias = jest.fn().mockResolvedValue(true);

      return fn('index')
        .then(() => {
          expect(lib.existsAlias).toHaveBeenCalledTimes(1);
        });
    });

    test('calls initAlias successfully', () => {
      lib.existsAlias = jest.fn().mockResolvedValue(false);
      lib.initAlias = jest.fn().mockResolvedValue(true);

      return fn('index')
        .then(() => {
          expect(lib.initAlias).toHaveBeenCalledTimes(1);
          expect(logMock).toHaveBeenCalledTimes(1);
        });
    });

    test('calls initAlias successfully and catches if rejected', () => {
      lib.existsAlias = jest.fn().mockResolvedValue(false);
      lib.initAlias = jest.fn().mockRejectedValue(false);

      return fn('index')
        .then(() => {
          expect(logMock).toHaveBeenCalledTimes(1);
          expect(logMock).toHaveBeenCalledWith('error', false);
        });
    });
  });

  describe('createMappingIfNone', () => {
    const fn = lib.createMappingIfNone;

    test('calls existsMapping successfully', () => {
      lib.existsMapping = jest.fn().mockResolvedValue({
        index: { mappings: { _doc: { properties: {} } } }
      });
      lib.initMapping = jest.fn().mockResolvedValue(false);

      return fn('index', 'mapping')
        .then(() => {
          expect(lib.existsMapping).toHaveBeenCalledTimes(1);
        });
    });

    test('calls initMapping successfully', () => {
      lib.existsMapping = jest.fn().mockResolvedValue();
      lib.initMapping = jest.fn().mockResolvedValue(true);

      return fn('index', 'mapping')
        .then(() => {
          expect(lib.initMapping).toHaveBeenCalledTimes(1);
        });
    });

    test('catches on initMapping if there is a rejection', () => {
      lib.existsMapping = jest.fn().mockResolvedValue();
      lib.initMapping = jest.fn().mockRejectedValue(false);

      return fn('index', 'mapping')
        .then(() => {
          expect(lib.initMapping).toHaveBeenCalledTimes(1);
        });
    });

    test('logs if the mapping is already found', () => {
      lib.existsMapping = jest.fn().mockResolvedValue({
        index: { mappings: { _doc: { properties: {} } } }
      });
      lib.initMapping = jest.fn().mockRejectedValue(false);
      return fn('index', 'mapping')
        .then(() => expect(lib.initMapping).not.toHaveBeenCalled());
    });
  });

  describe('createIndexName', () => {
    const fn = lib.createIndexName;

    it('returns a string', () => {
      expect(fn('alias')).toBe('alias_v1');
    });
  });

  describe('createIndexIfNone', () => {
    const fn = lib.createIndexIfNone;

    it('calls the createIndexIfNone method', () => {
      client.indices.exists.mockResolvedValue(true);
      return fn('index')
        .then(() => expect(client.indices.exists).toHaveBeenCalledTimes(1));
    });

    it('calls the initIndex function', () => {
      client.indices.exists.mockResolvedValue(false);
      lib.initIndex = jest.fn().mockResolvedValue(true);

      return fn('index')
        .then(() => expect(lib.initIndex).toHaveBeenCalledTimes(1));
    });

    it('when initIndex is called it will catch if it is rejected', () => {
      client.indices.exists.mockResolvedValue(false);
      lib.initIndex = jest.fn().mockRejectedValue(false);

      return fn('index')
        .then(() => expect(lib.initIndex).toHaveBeenCalledTimes(1));
    });
  });

  describe('existsIndex', () => {
    const fn = lib.existsIndex;

    it('calls the existsIndex method provided by the ES client', () => {
      client.indices.exists.mockResolvedValue('ES Client `existsIndex` called');
      return fn('name')
        .then(() => expect(client.indices.exists).toHaveBeenCalledTimes(1));
    });
  });

  describe('existsDocument', () => {
    const fn = lib.existsDocument;

    test('rejects if no id is provided', () => {
      return expect(fn('pages')).rejects.toThrow();
    });

    test('calls the exists method provided by the ES client', () => {
      client.exists.mockResolvedValue('ES Client `exists` called');

      return fn('pages', 'site/_pages/foo')
        .then(() => expect(client.exists).toHaveBeenCalledTimes(1));
    });
  });

  describe('getDocument', () => {
    const fn = lib.getDocument;

    it('rejects if no id is provided', () => {
      const errMsg = 'Cannot get a document without the id';

      return fn('pages')
        .catch(err => {
          expect(err).toHaveProperty('message', errMsg);
          expect(logMock).toHaveBeenCalledTimes(1);
        });
    });

    it('calls the exists method provided by the ES client', () => {
      client.get.mockResolvedValue(Promise.resolve('ES Client `get` called'));
      return fn('pages', 'site/_pages/foo')
        .then(() => {
          expect(client.get).toHaveBeenCalledTimes(1);
        });
    });
  });

  describe('update', () => {
    var fn = lib.update;

    it('rejects if no data is provided', () => {
      const errMsg = 'Updating an Elastic document requires a data object';

      return fn('pages', 'site/_pages/foo')
        .catch(err => expect(err).toHaveProperty('message', errMsg));
    });

    it('calls the update method provided by the ES client', () => {
      client.update.mockResolvedValue('ES Client `update` called');
      return fn('pages', 'site/_pages/foo', {})
        .then(() => expect(client.update).toHaveBeenCalledTimes(1));
    });

    it('calls the update method provided by the ES client with refresh param', () => {
      client.update.mockResolvedValue('ES Client `update` called');
      return fn('pages', 'site/_pages/foo', {}, true)
        .then(()=> expect(client.update).toHaveBeenCalled());
    });
  });

  describe('validateIndices', () => {
    const fn = lib.validateIndices,
      mapping = {
        pages: {
          _doc: {
            dynamic: 'strict',
            properties: {
              prop: { type: 'string', index: 'not_analyzed' },
            }
          }
        }
      };

    test('calls createIndexIfNone, createAliasIfNone and createMappingIfNone', () => {
      lib.createIndexIfNone = jest.fn().mockResolvedValue('index');
      lib.createAliasIfNone = jest.fn().mockResolvedValue('alias');
      lib.initAlias = jest.fn().mockResolvedValue({});
      lib.createMappingIfNone = jest.fn().mockResolvedValue(mapping);

      return fn(mapping, {})
        .then(() => {
          expect(lib.createIndexIfNone).toHaveBeenCalled();
          expect(lib.createAliasIfNone).not.toHaveBeenCalled();
          expect(lib.createMappingIfNone).toHaveBeenCalled();
        });
    });

    test('it logs if something fails', () => {
      lib.createIndexIfNone = jest.fn().mockResolvedValue('index');
      lib.createAliasIfNone = jest.fn().mockResolvedValue('alias');
      lib.initAlias = jest.fn().mockRejectedValue(new Error('foo'));
      lib.createMappingIfNone = jest.fn().mockResolvedValue(mapping);

      return fn(mapping, {})
        .catch(() => {
          expect(lib.createIndexIfNone).toHaveBeenCalled();
          expect(lib.createAliasIfNone).not.toHaveBeenCalled();
          expect(lib.createMappingIfNone).toHaveBeenCalled();
        });
    });

    test('it logs if something fails', () => {
      lib.existsAlias = jest.fn().mockRejectedValue(new Error('foo'));

      return fn(mapping, {})
        .catch(() => {
          expect(logMock).toHaveBeenCalled();
        });
    });

    test('calls createIndexIfNone, createAliasIfNone and createMappingIfNone', () => {
      lib.existsAlias.mockResolvedValue(true);
      lib.createMappingIfNone = jest.fn().mockResolvedValue(mapping);

      return fn(mapping, {})
        .then(() => {
          expect(lib.createIndexIfNone).not.toHaveBeenCalled();
          expect(lib.createAliasIfNone).not.toHaveBeenCalled();
          expect(logMock).toHaveBeenCalledWith('debug', 'Elasticsearch alias exists at pages_v1');
        });
    });
  });

  describe('existsAlias', () => {
    const fn = lib.existsAlias;

    test('calls the existsAlias method provided by the ES client', () => {
      client.indices.existsAlias.mockResolvedValue('ES Client `existsAlias` called');

      return fn('name')
        .then(() => expect(client.indices.existsAlias).toHaveBeenCalled());
    });
  });

  describe('query', () => {
    const fn = lib.query;

    test('calls the search method provided by the ES client', () => {
      client.search.mockResolvedValue();
      return fn('index', 'query', 'type')
        .then(() => expect(client.search).toHaveBeenCalled());
    });

    test('logs an error if one arises', () => {
      client.search.mockRejectedValue(new Error('foo'));
      return fn('index', 'query', 'type')
        .catch(() => {
          expect(logMock).toHaveBeenCalled();
        });
    });
  });

  describe('del', () => {
    const fn = lib.del;

    test('calls the delete method provided by the ES client', () => {
      client.delete.mockResolvedValue('ES Client `delete` called');
      return fn('index', 'type', 'some/ref')
        .then(() => expect(client.delete).toHaveBeenCalled());
    });

    test('logs an error if one arises', () => {
      client.delete.mockRejectedValue(new Error('foo'));
      return fn('index', 'query', 'type')
        .catch(() => {
          expect(logMock).toHaveBeenCalled();
        });
    });
  });

  describe('put', () => {
    const fn = lib.put;

    test('calls the index method provided by the ES client', () => {
      client.index.mockResolvedValue('ES Client `put` called');
      return fn('index', 'type', 'some/ref')
        .then(() => expect(client.index).toHaveBeenCalled());
    });

    test('logs an error if one arises', () => {
      client.index.mockRejectedValue(new Error('foo'));
      return fn('index', 'query', 'type')
        .catch(() => {
          expect(logMock).toHaveBeenCalled();
        });
    });
  });

  describe('convertRedisBatchtoElasticBatch', () => {
    const fn = lib.convertRedisBatchtoElasticBatch;

    test('logs an error if op.value is a string', () => {
      const ops = [{ value: 'value' }];

      fn('index', ops);
      expect(logMock).toHaveBeenCalled();
    });

    test('returns an array of ops if type property equals "put"', () => {
      var ops = [{ value: {}, type: 'put' }];

      expect(fn('index', ops)).toEqual([{ index: { _index: 'index', _type: '_doc' } }, {}]);
    });

    test('assigns a "key" property if one is defined in the op', () => {
      var ops = [{ value: {}, type: 'put', key: 'key' }];

      expect(fn('index', ops)).toEqual([{ index: { _id: 'key', _index: 'index', _type: '_doc' } }, {}]);
    });

    test('assigns a "key" property if one is defined in the op', () => {
      var ops = [{ value: {}, type: 'get', key: 'key' }];

      expect(fn('index', ops)).toEqual([]);
    });
  });

  describe('batch', () => {
    const fn = lib.batch;

    test('calls bulk method successfully', () => {
      client.bulk.mockResolvedValue();
      return fn([])
        .then(() => expect(client.bulk).toHaveBeenCalled());
    });

    test('bulk rejects and returns an Error if failed', () => {
      client.bulk.mockResolvedValue({ errors: true });
      return fn([])
        .catch(error => expect(error).toBeInstanceOf(Error));
    });
  });

  describe('putSettings', () => {
    const fn = lib.putSettings;

    test('calls the `putSettings` method exposed on the client', () => {
      client.indices.putSettings.mockResolvedValue(true);
      return fn('pages', {})
        .then(() => expect(client.indices.putSettings).toHaveBeenCalled());
    });

    test('putSettings rejects and returns an Error if failed', () => {
      client.indices.putSettings.mockRejectedValue(new Error('error message'));
      return fn('pages', {})
        .catch(error => {
          expect(error).toBeInstanceOf(Error);
        });
    });
  });

  describe('getInstance', () => {
    test('returns an instance of the client', () => {
      expect(lib.getInstance()).toEqual(lib.client);
    });
  });

  describe('findIndexFromAlias', () => {
    test('given an alias, returns an index', () => {
      client.cat.aliases.mockResolvedValue([{ alias: 'foo', index: 'foo_v1'}]);

      return lib.findIndexFromAlias('foo')
        .then(resp => {
          expect(resp).toBe('foo_v1');
        });
    });

    test('returns alias with default version if no index is found', () => {
      client.cat.aliases.mockResolvedValue([]);

      return lib.findIndexFromAlias('foo')
        .then(resp => {
          expect(resp).toBe('foo_v1');
        });
    });
  });
});
