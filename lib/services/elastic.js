'use strict';

const elastic = require('elasticsearch'),
  helpers = require('./elastic-helpers'),
  bluebird = require('bluebird'),
  _ = require('lodash'),
  util = require('util'),
  log = require('./log').setup({file: __filename}),
  endpoint = process.env.ELASTIC_HOST || '',
  serverConfig = {
    host: endpoint,
    maxSockets: 500,
    apiVersion: '2.4',
    defer: () => bluebird.defer()
  };

// Reference to the ES client
var client;


/**
 * Test whether or not the client is connected
 * to Elastic
 *
 * @param  {object} currentClient
 * @returns {Promise}
 */
function healthCheck(currentClient) {
  return currentClient.ping({
    requestTimeout: 1000
  }).then(function () {
    log('info', 'Elasticsearch cluster is up!');
    return bluebird.resolve();
  }).catch(function (error) {
    log('info', 'Elasticsearch cluster is down!');
    return bluebird.reject(error);
  });
}

/**
 * Create an Elasticsearch index
 *
 * @param {string} index
 * @returns {Promise}
 */
function initIndex(index) {
  return client.indices.create({
    index: index,
    body: {}
  }).then(function () {
    log('info', `Successfully created ${index}`);
  })
    .catch(function (error) {
      log('error', error);
      return bluebird.reject(error);
    });
}

/**
 * Check if an Elasticsearch index exists
 *
 * @param {string} index
 * @returns {Promise}
 */
function existsIndex(index) {
  return client.indices.exists({
    index: index
  });
}

/**
 * CHeck if a document with a given `id` exists
 * in the index
 *
 * @param  {string} index
 * @param  {string} type
 * @param  {string} id
 * @return {Promise}
 */
function existsDocument(index, type, id) {
  if (!id) {
    throw new Error('Cannot check if document exists without an id');
  }

  return client.exists({
    index: index,
    type: type,
    id: id
  });
}

/**
 * Indices should have a different name than the alias
 * Append '_v1' to an index name.
 *
 * @param {String} alias
 * @param {String} prefix
 * @returns {String}
 */
function createIndexName(alias, prefix) {
  return `${helpers.indexWithPrefix(alias, prefix)}_v1`;
}

/**
 * Create an Elasticsearch alias
 *
 * @param {string} name, e.g. 'editable-articles' for the index 'editable-articles_v1'
 * @param {string} index
 * @returns {Promise}
 */
function initAlias(name, index) {
  return client.indices.putAlias({
    name: name,
    index: index
  });
}

/**
 * Check if an Elasticsearch alias exists
 *
 * @param {string} name
 * @returns {Promise}
 */
function existsAlias(name) {
  return client.indices.existsAlias({
    name: name
  });
}

/**
 * Create an Elasticsearch mapping
 *
 * @param {string} index
 * @param {string} type
 * @param {object} mapping
 * @returns {Promise}
 */
function initMapping(index, type, mapping) {
  return client.indices.putMapping({
    index: index,
    type: type,
    body: mapping
  }).then(function () {
    log('info', `Successfully created a mapping for ${index}`);
    return bluebird.resolve(index);
  })
    .catch(function (error) {
      log('error', error);
      return bluebird.reject(error);
    });
}

/**
 * Add settings to an index
 *
 * @param {string} index
 * @param {object} settings
 * @returns {Promise}
 */
function putSettings(index, settings) {
  return client.indices.putSettings({
    index: index,
    body: settings
  }).then(function () {
    log('info', `Successfully put settings for ${index}`);
    return bluebird.resolve(index);
  }).catch(function (error) {
    log('error', error);
    return bluebird.reject(error);
  });
}

/**
 * Add settings to an index if it exists
 *
 * @param {String} index
 * @param {Object} settings
 * @return {Promise}
 */
function addSettings(index, settings) {
  return module.exports.existsIndex(index)
    .then(function (exists) {
      if (exists) {
        return client.indices.close({index})
          .then(() => module.exports.putSettings(index, settings))
          .then(() => client.indices.open({index}));
      } else {
        log('warn', `Could not put settings for index ${index} because it does not exist`);
        return bluebird.resolve();
      }
    });
}

/**
 * Check if an Elasticsearch mapping exists
 * Note: An empty mapping can still exist
 *
 * @param {string} index
 * @param {type} type
 * @returns {Promise}
 */
function existsMapping(index, type) {
  return client.indices.getMapping({
    index: index,
    type: type
  });
}

/**
 * Create an Elasticsearch mapping if one doesn't exist
 *
 * @param {string} index
 * @param {string} type
 * @param {object} mapping
 * @returns {Promise}
 */
function createMappingIfNone(index, type, mapping) {
  return module.exports.existsMapping(index, type)
    .then(function (result) {
      let getMapping = _.get(result, index + '.mappings.' + type);

      if (!_.size(getMapping)) {
        log('info', 'Mapping is missing!');

        return module.exports.initMapping(index, type, mapping)
          .then(function (result) {
            log('info', `Creating mapping ${index} ${type}: ${result}`);
          }).catch(function (error) {
            log('error', error.stack);
          });
      } else {
        log('info', `Mapping found for ${index}`);
      }
    });
}

/**
 * Create an Elasticsearch index if one doesn't exist
 *
 * @param {string} index
 * @returns {Promise}
 */
function createIndexIfNone(index) {
  return existsIndex(index)
    .then(function (exists) {
      if (!exists) {
        return module.exports.initIndex(index)
          .then(function () {
            log('info', `Creating Elasticsearch index: ${index}`);
          })
          .catch(function (error) {
            log('error', error);
          });
      } else {
        log('info', `Elasticsearch index exists at ${index}`);
      }
    });
}

/**
 * Create an Elasticsearch alias if one doesn't exist
 *
 * @param {String} index
 * @param {String} prefix
 * @returns {Promise}
 */
function createAliasIfNone(index, prefix) {
  const indexWithPrefix = createIndexName(index, prefix),
    aliasWithPrefix = `${helpers.indexWithPrefix(index, prefix)}`;

  return module.exports.existsAlias(aliasWithPrefix)
    .then(function (exists) {
      if (!exists) {
        // Indices should have a different name than the alias
        // Append '_v1' to newly created indices
        return module.exports.initAlias(aliasWithPrefix, indexWithPrefix)
          .then(function (result) {
            log('info', `Creating Elasticsearch alias ${aliasWithPrefix}: ${result}`);
          })
          .catch(function (error) {
            log('error', error);
          });
      } else {
        log('info', `Elasticsearch alias exists at ${indexWithPrefix}`);
      }
    });
}

/**
 * Convert Redis batch operations to Elasticsearch batch operations
 *
 * @param {string} index
 * @param {string} type
 * @param {Array} ops
 * @returns {Array}
 */
function convertRedisBatchtoElasticBatch(index, type, ops) {
  let bulkOps = [];

  _.each(ops, function (op) {
    if (_.isString(op.value)) {
      throw new TypeError('op.value cannot be string: ' + JSON.stringify(op));
    } else if (op.type === 'put') {
      let indexOp = {
        _index: index,
        _type: type
      };

      // key is optional; if missing, an id will be generated that is unique across all shards
      if (op.key) {
        indexOp._id = op.key;
      }

      bulkOps.push({ index: indexOp }, op.value);
    } else {
      log('warn', `Unhandled batch operation: ${op}`);
    }
  });
  return bulkOps;
}

/**
 * Query an Elasticsearch index
 *
 * @param {string} index
 * @param {string} query
 * @param {string} type
 * @returns {Promise}
 */
function query(index, query, type) {
  return client.search({
    index: index,
    type: type,
    body: query
  })
    .catch(function (error) {
      log('error', error);
      return bluebird.reject(error);
    });
}


/**
 * Index an Elasticsearch document
 *
 * @param {string} index
 * @param {string} type
 * @param {string} ref, e.g. 'localhost.dev.nymag.biz/scienceofus/components/article/instances/section-test'
 * @param {object} source
 * @returns {Promise}
 */
function put(index, type, ref, source) {
  return client.index({
    index: index,
    type: type,
    id: ref,
    body: source
  }).then(function (resp) {
    log('info', JSON.stringify(resp));
  }).catch(function (error) {
    log('error', error);
    return bluebird.reject(error);
  });
}

/**
 * Delete an Elasticsearch document
 *
 * @param {string} index
 * @param {string} type
 * @param {string} ref, e.g. 'localhost.dev.nymag.biz/scienceofus/components/article/instances/section-test'
 * @returns {Promise}
 */
function del(index, type, ref) {
  return client.delete({
    index: index,
    type: type,
    id: ref
  }).then(function (resp) {
    log('info', JSON.stringify(resp));
    return resp;
  }).catch(function (error) {
    log('error', error);
    return bluebird.reject(error);
  });
}

/**
 * Perform multiple index operations
 *
 * @param {Array} ops
 * @returns {Promise}
 */
function batch(ops) {
  return client.bulk({
    body: ops
  }).then(function (resp) {
    if (resp && resp.errors === true) {
      let str = ['Client.bulk errored on ' + util.inspect(ops, {
        depth: 10
      })];

      return bluebird.reject(new Error(str));
    }
  });
}

/**
 * Create the ES Client or an empty object
 *
 * @param {Object} overrideClient
 */
function setup(overrideClient) {
  if (!module.exports.endpoint && !overrideClient) {
    throw new Error('No Elastic endpoint or client override');
  }

  // Set the exported client
  module.exports.client = client = module.exports.endpoint && !overrideClient ? new elastic.Client(_.clone(serverConfig)) : _.assign(module.exports.client, overrideClient);
}

/**
 * Check if the correct indices exist, and if they don't, create them.
 *
 * @param {Object} mappings
 * @param {Object} settings
 * @param {String} prefix
 * @returns {Promise}
 */
function validateIndices(mappings, settings, prefix) {
  return bluebird.all(_.map(Object.keys(mappings), function (index) {
    return module.exports.createIndexIfNone(createIndexName(index, prefix)).then(function () {
      return module.exports.createAliasIfNone(index, prefix);
    });
  }))
    .then(function () {
      return bluebird.all(_.map(mappings, function (list, index) {
        if (settings && settings[index]) {
          return module.exports.addSettings(createIndexName(index, prefix), settings[index]);
        }
        return bluebird.resolve();
      }));
    })
    .then(function () {
      return bluebird.all(_.reduce(mappings, function (list, types, index) {
        return list.concat(_.map(types, function (mapping, type) {
          return module.exports.createMappingIfNone(createIndexName(index, prefix), type, mapping);
        }));
      }, []));
    });
}

/**
 * Retrieve the data for a document in the
 * index with a matching `id`
 *
 * @param  {string} index
 * @param  {string} type
 * @param  {string} id
 * @return {Promise}
 */
function getDocument(index, type, id) {
  if (!id) {
    throw new Error('Cannot get a document without the id');
  }

  return client.get({
    index: index,
    type: type,
    id: id
  });
}

/**
 * Update a document in an elastic search index.
 *
 * @param  {string} index
 * @param  {string} type
 * @param  {string} id
 * @param  {object} data
 * @param  {Boolean} refresh
 * @param  {Boolean} upsert
 * @return {Promise}
 */
function update(index, type, id, data, refresh = false, upsert = false) { // eslint-disable-line max-params
  if (!data) {
    throw new Error('Updating an Elastic document requires a data object');
  }

  return client.update({
    index, type, id, refresh,
    body: {
      doc: data,
      doc_as_upsert: upsert
    }
  });
}


function getInstance() {
  return module.exports.client || client;
}

module.exports.setup = setup;
module.exports.endpoint = endpoint;
module.exports.healthCheck = healthCheck;
module.exports.initIndex = initIndex;
module.exports.initAlias = initAlias;
module.exports.createIndexIfNone = createIndexIfNone;
module.exports.createAliasIfNone = createAliasIfNone;
module.exports.existsAlias = existsAlias;
module.exports.existsIndex = existsIndex;
module.exports.existsDocument = existsDocument;
module.exports.initMapping = initMapping;
module.exports.existsMapping = existsMapping;
module.exports.putSettings = putSettings;
module.exports.addSettings = addSettings;
module.exports.createMappingIfNone = createMappingIfNone;
module.exports.convertRedisBatchtoElasticBatch = convertRedisBatchtoElasticBatch;
module.exports.getDocument = getDocument;
module.exports.update = update;
module.exports.del = del;
module.exports.batch = batch;
module.exports.put = put;
module.exports.query = query;
module.exports.validateIndices = validateIndices;
module.exports.getInstance = getInstance;
// Exported for testing
module.exports.createIndexName = createIndexName;
