/* eslint complexity: ["error", 9] */
'use strict';

const _ = require('lodash'),
  bluebird = require('bluebird'),
  refProp = '_ref',
  log = require('./log').setup({file: __filename}),
  setup = require('../setup'),
  sites = require('./sites'),
  { uriPrefixToSlug } = require('clayutils')

/**
 * Used to test Elasticsearch data types
 *
 * @type {Array}
 */
var genericTypeParsers = [{
  when: compare('string'),
  then: convertOpValuesPropertyToString
}, {
  when: compare('date'),
  then: function (propertyName, ops) {
    return ops;
  }
}, {
  when: compare('object'),
  then: function (propertyName, ops) {
    return ops;
  }
}];

// Required for `_.listDeepObjects`
_.mixin(require('lodash-ny-util'));

/**
 * Strip the prefix from the index name. Handy for
 * finding a mapping.
 *
 * @param  {String} index
 * @return {String}
 */
function stripPrefix(index) {
  return setup.prefix ? index.replace(`${setup.prefix}_`, '') : index;
}

/**
 * Add a prefix to an index name if the prefix exists
 *
 * @param  {String} index
 * @param  {String} prefix
 * @return {String}
 */
function indexWithPrefix(index, prefix) {
  let setupOrArg = prefix || setup.prefix;

  return setupOrArg ? `${setupOrArg}_${index}`.trim() : index;
}

/**
 * A function which returns a function to help
 * compare two values. Pass in the value you expect
 * and then invoke the function with the value you're
 * testing as the new argument.
 *
 * @param  {String} expected
 * @return {Function}
 */
function compare(expected) {
  return comparison => expected === comparison;
}

/**
 * @param {object} op
 * @returns {object}
 */
function parseOpValue(op) {
  try {
    if (_.isString(op.value)) {
      op.value = JSON.parse(op.value);
    }
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
          let site = sites(value[refProp]),
            uri = site ? uriPrefixToSlug(value[refProp], site) : value[refProp];

          result = setup.options.db.get(uri).then(JSON.parse).then(function (referencedValue) {
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
    .then(resolveReferencesForPropertyOfStringType(propertyName));
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
 * @throws will throw an error if options.action is not supported
 * @returns {Array}
 */
function convertRedisBatchtoElasticBatch(options) {
  let bulkOps = [],
    index = options.index,
    type = options.type,
    ops = options.ops,
    action = options.action || 'index'; // default to overwrite document

  _.each(ops, function (op) {
    if (_.isString(op.value)) {
      op.value = JSON.parse(op.value);
    }

    if (op.type === 'put') {
      let indexOp = { _index: index, _type: type },
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
          throw new Error(`${action} is not supported`);
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
 * @param {Object} mapping
 * @param {Array} ops
 * @returns {Promise}
 */
function normalizeOpValuesWithMapping(mapping, ops) {
  var promises,
    properties = mapping.properties;

  promises = _.map(properties, function (property, propertyName) {
    var type = property.type,
      rule = _.find(genericTypeParsers, function (comparitor) {
        return comparitor.when(type);
      });

    if (rule) {
      return rule.then(propertyName, ops);
    }
  });

  return bluebird.all(promises).return(ops);
}

/**
 * Iterate through the mappings and types and invoke a function
 * (which is passed in by the user) to filter the ops down to what
 * is necessary for a specific index.
 *
 * @param  {Array}    batchOps      db operations
 * @param  {Object}   mappings      keys are index names, and values are index mapping settings
 * @param  {String}   indexName     name of the elastic search index
 * @param  {Function} opsTransform  function given batchOps that returns a Promise or object
 * @return {Promise.<[[{ops: {}, mapping: {}, typeName: string}]]>}
 */
function applyOpFilters(batchOps, mappings, indexName, opsTransform) {
  indexName = stripPrefix(indexName); // Trim the prefix off the index for comparing against mapping names

  return bluebird.all(_.map(_.pick(mappings, indexName), function (types) {
    return bluebird.all(_.map(types, function (mapping, typeName) {
      return bluebird.resolve(opsTransform(batchOps))
        .then(transformedOps => ({
          ops: transformedOps,
          mapping: mapping, // TODO: May not need to return mapping
          typeName: typeName
        }));
    }));
  }));
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
module.exports.compare = compare;
// For testing
module.exports.resolveReferencesForPropertyOfStringType = resolveReferencesForPropertyOfStringType;
module.exports.indexWithPrefix = indexWithPrefix;
module.exports.stripPrefix = stripPrefix;
