'use strict';

const elastic = require('elasticsearch'),
  helpers = require('./elastic-helpers'),
  bluebird = require('bluebird'),
  _ = require('lodash'),
  endpoint = process.env.ELASTIC_HOST || '',
  serverConfig = {
    host: endpoint,
    maxSockets: 500,
    apiVersion: '6.x',
    defer: () => {
      let resolve, reject;
      const promise = new Promise(() => {
        resolve = arguments[0];
        reject = arguments[1];
      });

      return {
        resolve: resolve,
        reject: reject,
        promise: promise
      };
    }
  },
  FIXED_TYPE = '_doc';
var log = require('./log').setup({file: __filename}),
  client; // Reference to the ES client

/**
 * Log the error with the stacktrace
 * @param  {Error} err
 */
function logError(err) {
  log('error', err.message, { stack: err.stack });
}

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
  }).then(() => {
    log('info', 'Elasticsearch cluster is up!');
    return bluebird.resolve();
  }).catch(error => {
    log('error', 'Elasticsearch cluster is down!');
    return bluebird.reject(error);
  });
}

/**
 * Create an Elasticsearch index
 *
 * @param {string} index
 * @param {object} settings
 * @returns {Promise}
 */
function initIndex(index, settings) {
  return client.indices.create({
    index: index,
    body: settings || {}
  }).then(() => {
    log('debug', `Successfully created ${index}`);
  })
    .catch(error => {
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
 * @param  {string} id
 * @return {Promise}
 */
function existsDocument(index, id) {
  if (!id) {
    let err = new Error('Cannot check if document exists without an id');

    logError(err);
    return bluebird.reject(err);
  }

  return client.exists({
    index: index,
    type: FIXED_TYPE,
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
 * @param {object} mapping
 * @returns {Promise}
 */
function initMapping(index, mapping) {
  return client.indices.putMapping({
    index: index,
    type: FIXED_TYPE,
    body: mapping
  }).then(() => {
    log('debug', `Successfully created a mapping for ${index}`);
    return bluebird.resolve(index);
  })
    .catch(error => {
      log('error', error.message);
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
  }).then(() => {
    log('debug', `Successfully put settings for ${index}`);
    return bluebird.resolve(index);
  }).catch(error => {
    log('error', error.message);
    return bluebird.reject(error);
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
function existsMapping(index) {
  return client.indices.getMapping({index});
}

/**
 * Create an Elasticsearch mapping if one doesn't exist
 *
 * @param {string} index
 * @param {object} mapping
 * @returns {Promise}
 */
function createMappingIfNone(index, mapping) {
  return module.exports.existsMapping(index)
    .then(function (result) {
      let getMapping = _.get(result, `${index}.mappings.${FIXED_TYPE}`);

      if (!_.size(getMapping)) {
        log('warn', `Mapping is missing for ${index}!`);

        return module.exports.initMapping(index, mapping)
          .then(function (result) {
            log('info', `Creating mapping ${index}: ${result}`);
          }).catch(error => {
            log('error', error.message, { stack: error.stack });
          });
      } else {
        log('debug', `Mapping found for ${index}`);
      }
    })
    .catch(logError);
}

/**
 * Create an Elasticsearch index if one doesn't exist
 *
 * @param {string} index
 * @param {string} settings
 * @returns {Promise}
 */
function createIndexIfNone(index, settings) {
  return existsIndex(index)
    .then(function (exists) {
      if (!exists) {
        return module.exports.initIndex(index, settings)
          .then(() => {
            log('info', `Creating Elasticsearch index: ${index}`);
          })
          .catch(error => {
            log('error', error);
          });
      } else {
        log('debug', `Elasticsearch index exists at ${index}`);
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
            log('info', `Creating Elasticsearch alias ${aliasWithPrefix}: ${JSON.stringify(result)}`);
          })
          .catch(error => {
            log('error', error);
          });
      } else {
        log('debug', `Elasticsearch alias exists at ${indexWithPrefix}`);
      }
    });
}

/**
 * Convert Redis batch operations to Elasticsearch batch operations
 *
 * @param {string} index
 * @param {Array} ops
 * @returns {Array}
 */
function convertRedisBatchtoElasticBatch(index, ops) {
  let bulkOps = [];

  _.each(ops, function (op) {
    if (_.isString(op.value)) {
      let err = new TypeError('op.value cannot be string');

      log('error', 'op.value cannot be a string', {
        stack: err.stack,
        op
      });
    } else if (op.type === 'put') {
      let indexOp = {
        _index: index,
        _type: FIXED_TYPE
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
function query(index, query) {
  return client.search({
    index: index,
    type: FIXED_TYPE,
    body: query
  })
    .catch(error => {
      log('error', error);
      return bluebird.reject(error);
    });
}

/**
 * Index an Elasticsearch document
 *
 * @param {string} index
 * @param {string} ref, e.g. 'localhost.dev.nymag.biz/scienceofus/_components/article/instances/section-test'
 * @param {object} source
 * @returns {Promise}
 */
function put(index, ref, source) {
  return client.index({
    index: index,
    type: FIXED_TYPE,
    id: ref,
    body: source
  }).then(function (resp) {
    log('debug', JSON.stringify(resp));
  }).catch(error => {
    log('error', error);
    return bluebird.reject(error);
  });
}

/**
 * Delete an Elasticsearch document
 *
 * @param {string} index
 * @param {string} ref, e.g. 'localhost.dev.nymag.biz/scienceofus/_components/article/instances/section-test'
 * @returns {Promise}
 */
function del(index, ref) {
  return client.delete({
    index: index,
    type: FIXED_TYPE,
    id: ref
  }).then(function (resp) {
    log('debug', JSON.stringify(resp));
    return resp;
  }).catch(error => {
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
      let err = new Error('Client.bulk errored on batch operation');

      log('error', err.message, {
        ops,
        items: resp.items
      });
      return bluebird.reject(err);
    }
  });
}

/**
 * Create the ES Client or an empty object
 *
 * @param {Object} overrideClient
 * @returns {Promise}
 */
function setup(overrideClient) {
  if (!module.exports.endpoint && !overrideClient) {
    let err = new Error('No Elastic endpoint or client override');

    log('fatal', `${err.message}`, { stack: err.stack });
    return bluebird.reject(err);
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
  return bluebird.all(Object.keys(mappings).map(index => {
    const aliasWithPrefix = `${helpers.indexWithPrefix(index, prefix)}`,
      indexWithPrefix = createIndexName(index, prefix);

    return module.exports.existsAlias(aliasWithPrefix)
      .then(exists => {
        if (!exists) {
          // If there's no alias, then it's not pointed to an index, so
          // we should create an index to associate
          return module.exports.createIndexIfNone(indexWithPrefix, settings[index])
            .then(() => module.exports.initAlias(aliasWithPrefix, indexWithPrefix))
            .then(result => {
              log('info', `Creating Elasticsearch alias ${aliasWithPrefix}: ${JSON.stringify(result)}`);
            })
            .catch(error => log('error', error));
        } else {
          log('debug', `Elasticsearch alias exists at ${indexWithPrefix}`);
        }
      });
  }))
    .then(() => {
      return bluebird.all(_.reduce(mappings, (acc, types, index) => {
        // Push the Promise of creating the mapping into the accumulator
        acc.push(module.exports.createMappingIfNone(createIndexName(index, prefix), types[FIXED_TYPE]));
        return acc;
      }, []));
    })
    .catch(error => log('error', error.message, { stack: error.stack }));
}

/**
 * Retrieve the data for a document in the
 * index with a matching `id`
 *
 * @param  {string} index
 * @param  {string} id
 * @return {Promise}
 */
function getDocument(index, id) {
  if (!id) {
    let err = new Error('Cannot get a document without the id');

    logError(err);
    return bluebird.reject(err);
  }

  return client.get({
    index: index,
    type: FIXED_TYPE,
    id: id
  });
}

/**
 * Update a document in an elastic search index.
 *
 * @param  {string} index
 * @param  {string} id
 * @param  {object} data
 * @param  {Boolean} refresh
 * @param  {Boolean} upsert
 * @param  {Boolean} retry
 * @return {Promise}
 */
function update(index, id, data, refresh = false, upsert = false, retry = 10) { // eslint-disable-line max-params
  if (!data) {
    let err = new Error('Updating an Elastic document requires a data object');

    logError(err);
    return bluebird.reject(err);
  }

  return client.update({
    index,
    type: FIXED_TYPE,
    id,
    refresh,
    body: {
      doc: data,
      doc_as_upsert: upsert,
      retryOnConflict: retry
    }
  });
}

/**
 * Get all the aliases
 *
 * @returns {Promise}
 */
function getAliases() {
  return client.cat.aliases({
    format: 'json',
  });
}

/**
 * Given an alias, return the index
 *
 * @param {String} index
 * @returns {Promise}
 */
function findIndexFromAlias(index) {
  return getAliases()
    .then(resp => {
      if (!resp.length) {
        return `${index}_v1`;
      } else {
        return resp.filter(item => {
          return item.alias.indexOf(index) !== -1;
        })[0].index;
      }
    });
}

module.exports.setup = setup;
module.exports.endpoint = endpoint;
module.exports.healthCheck = healthCheck;
module.exports.initIndex = initIndex;
module.exports.initAlias = initAlias;
module.exports.createIndexIfNone = createIndexIfNone;
module.exports.createAliasIfNone = createAliasIfNone;
module.exports.findIndexFromAlias = findIndexFromAlias;
module.exports.getAliases = getAliases;
module.exports.existsAlias = existsAlias;
module.exports.existsIndex = existsIndex;
module.exports.existsDocument = existsDocument;
module.exports.initMapping = initMapping;
module.exports.existsMapping = existsMapping;
module.exports.putSettings = putSettings;
module.exports.createMappingIfNone = createMappingIfNone;
module.exports.convertRedisBatchtoElasticBatch = convertRedisBatchtoElasticBatch;
module.exports.getDocument = getDocument;
module.exports.update = update;
module.exports.del = del;
module.exports.batch = batch;
module.exports.put = put;
module.exports.query = query;
module.exports.validateIndices = validateIndices;
module.exports.getInstance = () => module.exports.client;
// Exported for testing
module.exports.createIndexName = createIndexName;
module.exports.setLog = mock => log = mock;
