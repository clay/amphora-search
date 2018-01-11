'use strict';

const _ = require('lodash'),
  refProp = '_ref';

/**
 * Search indices are not allowed to reference things (at least currently), because when the results are returned in a
 * template, they will be composed just like any other component.  This might be beneficial behaviour later, but not now.
 * @param {object} op
 * @returns {object}
 */
function filterRefs(op) {
  _.each(_.listDeepObjects(op, refProp), function (obj) {
    delete obj[refProp];
  });
  return op;
}

/**
 * Generic function for testing if op is of
 * a certain type. Just call the function with what
 * you're looking for and then you have a filter function.
 *
 * - Pages? isOpFor('pages')
 * - User? isOpFor('user')
 * - Component Foo? isOpFor('foo')
 *
 * @param  {[type]}  string [description]
 * @return {Boolean}        [description]
 */
function isOpFor(string) {
  return function (op) {
    return op.key.indexOf(`/${string}/`) !== -1;
  };
}

/**
 * @param {object} op
 * @param {string} op.key
 * @returns {boolean}
 */
function isPageOp(op) {
  return isOpFor('pages')(op);
}

/**
 * @param {object} op
 * @param {string} op.key
 * @returns {boolean}
 */
function isInstanceOp(op) {
  return isOpFor('instances')(op);
}

/**
 * @param {object} op
 * @param {string} op.type
 * @returns {boolean}
 */
function isPutOp(op) {
  return op.type === 'put';
}

/**
 * True is component is published ("@published")
 * @param {object} op
 * @param {string} op.key
 * @returns {boolean}
 */
function isPublished(op) {
  var version = op.key.split('@')[1];

  return version === 'published';
}

/**
 * True is component is published ("@published")
 * @param {object} op
 * @param {string} op.key
 * @returns {boolean}
 */
function isScheduled(op) {
  var version = op.key.split('@')[1];

  return version === 'scheduled';
}

/**
 * True is component is the latest version and therefore the best copy for editing (no version at all)
 * @param {object} op
 * @param {string} op.key
 * @returns {boolean}
 */
function isEditable(op) {
  var version = op.key.split('@')[1];

  return version === undefined;
}

module.exports.filterRefs = filterRefs;
module.exports.isPageOp = isPageOp;
module.exports.isInstanceOp = isInstanceOp;
module.exports.isPutOp = isPutOp;
module.exports.isPublished = isPublished;
module.exports.isScheduled = isScheduled;
module.exports.isEditable = isEditable;
module.exports.isOpFor = isOpFor;
