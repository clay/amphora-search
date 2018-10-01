/* eslint complexity: ["error", 9] */
'use strict';

const _ = require('lodash'),
  bluebird = require('bluebird'),
  refProp = '_ref',
  state = require('./state'),
  { prefix } = require('../constants'),
  FIXED_TYPE = '_doc',
  genericTypeParsers = {
    text: convertOpValuesPropertyToString,
    keyword: convertOpValuesPropertyToString,
    date: (propertyName, ops) => ops,
    object: (propertyName, ops) => ops
  };
var log = require('./log').setup({file: __filename}),
  db = require('../db');

// Required for `_.listDeepObjects`
_.mixin(require('lodash-ny-util'));

/**
 * Strip the prefix from the index name. Handy for
 * finding a mapping.
 *
 * @param  {String} index
 * @param  {String} testPrefix (for testing)
 * @return {String}
 */
function stripPrefix(index, testPrefix) {
  const p = testPrefix || prefix;

  return p ? index.replace(`${p}_`, '') : index;
}

/**
 * Add a prefix to an index name if the prefix exists
 *
 * @param  {String} index
 * @param  {String} passedPrefix
 * @return {String}
 */
function indexWithPrefix(index, passedPrefix) {
  let setupOrArg = passedPrefix || prefix;

  return setupOrArg ? `${setupOrArg}_${index}`.trim() : index;
}

/**
 * @param {object} op
 * @returns {object}
 */
function parseOpValue(op) {
  try {
    op.value = JSON.parse(op.value);
  } catch (ex) {
    log('warn', ex, { op });
  }

  return op;
}

/**
 * Convert thing to string or [string] -- ES doesn't know the difference.
 * @param {*} value
 * @returns {string|[string]}
 */
function convertObjectToString(value) {
  if (_.isArray(value)) {
    value = _.map(value, function (property) {
      var innerValue;

      if (_.isPlainObject(property)) {
        innerValue = _.find(_.pickBy(property, _.isString));
      } else if (_.isString(property)) {
        innerValue = property;
      } else {
        log('warn', `Bad String or [String] type ${value}`);
      }

      return innerValue;
    });
  } else if (_.isPlainObject(value)) {

    // Special special!  An array of 'items' means this object is actually an array with properties (the array's items
    // are moved to the 'items' property
    if (_.isArray(value.items)) {
      value = convertObjectToString(value.items);
    } else {
      // take first property of the object that is a string
      value = _.find(_.pickBy(value, _.isString));
    }

  } else if (!_.isString(value)) {
    log('warn', `Bad String or [String] type ${value}`);
    value = null;
  }

  return value;
}

/**
 * If any of the properties that should be
 * strings are references, resolve them.
 *
 * @param {string} propertyName
 * @returns {Function}
 */
function resolveReferencesForPropertyOfStringType(propertyName) {
  return function (ops) {
    return bluebird.all(_.map(ops, function (op) {
      var result, value = op.value[propertyName];

      if (value !== null && value !== undefined) {
        if (value[refProp]) {
          result = db.db.get(value[refProp]).then(function (referencedValue) {
            op.value[propertyName] = convertObjectToString(referencedValue);
            return op;
          });
        } else {
          op.value[propertyName] = convertObjectToString(value);
          result = op;
        }
      }

      return result;
    })).then(_.compact);
  };
}

/**
 * @param {string} propertyName
 * @param {Array} ops
 * @returns {Promise}
 */
function convertOpValuesPropertyToString(propertyName, ops) {
  return bluebird.all(ops)
    .then(module.exports.resolveReferencesForPropertyOfStringType(propertyName));
}


/**
 * Convert Redis batch operations to Elasticsearch batch operations
 *
 * @param {object} options
 * @param {string} options.index
 * @param {string} options.type
 * @param {Array}  options.ops
 * @param {string} [options.action] defaults to `index`, can use `create`, `index`, `update`, `delete`
 * @param {boolean} [options.docAsUpsert] if true and action is `update`, then it will create entry if not already indexed
 * @returns {Array}
 */
function convertRedisBatchtoElasticBatch(options) {
  let bulkOps = [],
    index = options.index,
    ops = options.ops,
    action = options.action || 'index'; // default to overwrite document

  _.each(ops, function (op) {
    if (_.isString(op.value)) {
      op.value = JSON.parse(op.value);
    }

    if (op.type === 'put') {
      let indexOp = { _index: index, _type: FIXED_TYPE },
        requestMetadata = {},
        requestBody;

      // key is optional; if missing, an id will be generated that is unique across all shards
      if (op.key) {
        indexOp._id = op.key;
      }

      switch (action) {
        case 'index':
        case 'create':
          requestBody = op.value;
          break;
        case 'update':
          indexOp._retry_on_conflict = 3; // Set a default retry value
          requestBody = {
            doc: op.value,
            doc_as_upsert: !!options.docAsUpsert
          };
          break;
        case 'delete':
          break;
        default:
          log('error', `Action ${action} is not supported`);
      }

      // Push the operation in before the request body
      bulkOps.push(_.set(requestMetadata, action, indexOp));

      // We may not have a request body if the action was `delete`
      if (requestBody) {
        bulkOps.push(requestBody);
      }
    } else {
      log('warn', 'Unhandled batch operation', { op });
    }
  });
  return bulkOps;
}


/**
 * The field types in a mapping have to match exactly, or ES will error.
 *
 * We don't care about the other properties.
 *
 * @param {string} index
 * @param {Array} ops
 * @returns {Promise}
 */
function normalizeOpValuesWithMapping(index, ops) {
  const { properties } = state.mappings[stripPrefix(index)][FIXED_TYPE], // Look in the mappings for the index and get the only type we support
    promises = _.map(properties, (property, propertyName) => {
      const rule = genericTypeParsers[property.type];

      return rule && rule(propertyName, ops);
    });

  return bluebird.all(promises).return(ops);
}

/**
 * Given ops and an index name,
 *
 * @param  {Array}    ops      db operations
 * @param  {String}   indexName     name of the elastic search index
 * @param  {Function} opsTransform  function given batchOps that returns a Promise or object
 * @return {Promise}
 */
function applyOpFilters(ops, indexName, opsTransform) {
  var mapping;

  if (!indexName || typeof indexName !== 'string') {
    return bluebird.reject(new Error(`Suppliend index is undefined or not a string: ${indexName}`));
  }
  mapping = _.cloneDeep(state.mappings[stripPrefix(indexName)]);
  return bluebird.try(opsTransform.bind(null, ops, mapping));
}

/**
 * Search indices are not allowed to reference things (at least currently), because when the results are returned in a
 * template, they will be composed just like any other component.  This might be beneficial behaviour later, but not now.
 * @param {object} op
 * @returns {object}
 */
function removeAllReferences(op) {
  _.each(_.listDeepObjects(op, refProp), function (obj) {
    delete obj[refProp];
  });
  return op;
}

module.exports.convertObjectToString = convertObjectToString;
module.exports.convertRedisBatchtoElasticBatch = convertRedisBatchtoElasticBatch;
module.exports.normalizeOpValuesWithMapping = normalizeOpValuesWithMapping;
module.exports.parseOpValue = parseOpValue;
module.exports.applyOpFilters = applyOpFilters;
module.exports.removeAllReferences = removeAllReferences;
// For testing
module.exports.resolveReferencesForPropertyOfStringType = resolveReferencesForPropertyOfStringType;
module.exports.indexWithPrefix = indexWithPrefix;
module.exports.stripPrefix = stripPrefix;
module.exports.convertOpValuesPropertyToString = convertOpValuesPropertyToString;
module.exports.setLog = mock => log = mock;
module.exports.setDb = mock => db = mock;
