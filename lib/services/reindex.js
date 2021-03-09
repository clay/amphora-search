'use strict';
/**
 * This module provides functions required to efficiently work with write streams.
 *
 * The batch/operation methods built into elastic-helpers.js and elastic.js
 * are designed to work with arrays of objects, rather than streams.
 *
 * The batchUpsert export is a generic termination point that can be used
 * for any write stream defined in a custom search handler.
 */
const h = require('highland');
const elastic = require('./elastic');
const log = require('./log').setup({file: __filename});
const { BATCH_SIZE, BATCH_TIME } = require('../constants');

/**
 * Converts a document update into a tuple of two batch API objects.
 * Use in a highland stream like this:
 *
 * h(source)
 *   .map(op => convertToBatch(op, index))
 *   .batchWithTimeOrCount(ms, n)
 *   .flatMap(sendBatch)
 *
 * @param {object} op: eg. { key: "component-id", value: {} }
 * @param {string} index: The name of the index to update.
 * @returns {object[]} A 2-item array of ES bulk API commands.
 */
const convertToBatch = (op, index) => [
  {
    update: {
      _id: op.key,
      _index: index,
      _type: '_doc'
    }
  },
  {
    doc: op.value,
    doc_as_upsert: true
  }
];

/**
 * Accepts an array of batch operation tuples and sends them as an ES batch request.
 *
 * @param {[object[]]} ops: An array of action tuples created from convertToBatch.
 * @returns {stream}
 */
const sendBatch = (ops) => h(
  elastic.batch(ops.flat()).then(() => ops.length)
);

/**
 * This wrapper function can be used to handle all batch ES write operations at
 * the end of a search handler.
 *
 * The following example would batch operations in groups of 1000 or as many
 * that accumulate within 60s:
 *
 * h(source)
 *   .through(batchUpsert(index, { batchSize = 1000, batchTime = 60000 }))
 *
 * @param {string} index: The name of the index.
 * @param {object} opts
 * @param {number} opts.batchSize: How many documents to include in a bulk request.
 * @param {number} opts.batchTime: How long to buffer documents for bulk requests.
 * @returns {stream}
 */
module.exports.batchUpsert = (index, { batchSize = BATCH_SIZE, batchTime = BATCH_TIME } = {}) => {
  return (stream) => (
    stream
      .map((op) => convertToBatch(op, index))
      .batchWithTimeOrCount(batchTime, batchSize)
      .flatMap(sendBatch)
      .errors((err) => log(err))
      .each((n) => log('info', `Processed ${n} documents for elastic index ${index}`))
  );
};
