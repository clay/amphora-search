'use strict';

/**
 * Converts an environment variable to a number, falling back to an alternate
 * value if a number is not provided. Optionally can clamp a value between
 * reasonable limits.
 *
 * @param {string} name: The name of the environment variable.
 * @param {number} def: The default value if no environment variable is provided.
 * @param {number} min: The minimum value to accept.
 * @param {number} max: The maximum value to accept.
 * @returns {number}
 */
function envToInt(name, def, { min, max } = {}) {
  let n = process.env[name];

  if (!Number.isFinite(n)) {
    n = def;
  }

  if (Number.isFinite(min)) {
    n = Math.max(min, n);
  }

  if (Number.isFinite(max)) {
    n = Math.min(max, n);
  }

  if (Number.isNaN(n)) {
    throw new TypeError(`envToInt must return number, got ${n}`);
  }

  return n;
}

/**
 * The BUS_NAMESPACE is a prefix that will be applied to all write streams
 * on require('amphora-search').streams.
 *
 * eg. BUS_NAMESPACE = 'clay' => streams['clay:write']
 *
 * It will also be used when interacting with Redis as a shared bus.
 */
module.exports.BUS_NAMESPACE = process.env.CLAY_BUS_NAMESPACE || 'clay';
module.exports.BUS_TOPICS = [
  'publishLayout',
  'publishPage',
  'unpublishPage',
  'createPage',
  'save',
  'delete',
  'deleteUser',
  'saveMeta',
  'saveUser'
];

/**
 * The ELASTIC_PREFIX applies a value before each Elasticsearch index name.
 *
 * eg. ELASTIC_PREFIX = 'clay' => 'clay_pages'
 *
 * This value can be modified to allow multiple environments to share a single
 * Elasticsearch resource (eg. development environments) or to rebuild indices
 * using a separate namespace.
 */
module.exports.prefix = process.env.ELASTIC_PREFIX || '';

/**
 * The AMPHORA_SEARCH_BATCH_* options modify the behavior of write streams
 * to send fewer Elasticsearch requests.
 *
 * In a typical web-server context the default values are desirable because users
 * will want to see changes reflected as quickly as possible.
 *
 * During a re-index operation higher values are advantageous because batching
 * increases throughput and reduces Elasticsearch JVM memory pressure.
 */
module.exports.BATCH_SIZE = envToInt('AMPHORA_SEARCH_BATCH_SIZE', 1, { min: 0 });
module.exports.BATCH_TIME = envToInt('AMPHORA_SEARCH_BATCH_TIME', 0, { min: 0 });
