'use strict';

// Filter-before-clone on the legacy `subscribe` fork.
//
// Deliberately a SEPARATE FILE from streams.test.js, because these are the only tests in the repo
// that need the module-level Highland streams to be pristine, and streams.test.js permanently
// breaks them:
//
//   - `lib['clay:save'].write = jest.fn()` (streams.test.js:155, :188, :221) assigns an own
//     property over Highland's prototype method on a stream created once at require time and never
//     recreated. Nothing restores it, so every later `dispatch('save', ...)` in that file writes to
//     a stale mock instead of the real stream.
//   - `lib.subscribe('save')` with no consumer (:154, :187, :220) leaves an unforked... rather, an
//     unconsumed fork attached to the source. Highland forks share backpressure, so an unconsumed
//     fork stalls the source for every other fork.
//
// Jest gives each test file its own module registry, so requiring streams.js here yields fresh
// streams. The alternative -- teaching streams.test.js to save/restore `write` and to consume every
// fork -- is the better long-term fix, but it means touching 30 passing tests to add coverage, so
// it is left as a follow-up rather than bundled in here.

const filename = 'streams',
  lib = require('./' + filename),
  OPS = [
    { type: 'put', key: 'site.com/_components/article/instances/a@published', value: '{}' },
    { type: 'put', key: 'site.com/_components/paragraph/instances/b@published', value: '{}' },
    { type: 'put', key: 'site.com/_pages/p@published', value: '{}' }
  ];

/**
 * @param {Object} op
 * @returns {Boolean}
 */
function isArticleOp(op) {
  return op.key.indexOf('/_components/article/') !== -1;
}

describe('streams subscribe filter-before-clone', () => {
  // `save` forks emit a substream per event, so these flatten with `.sequence()` -- the same shape
  // nymag/sites' handlers get from `.parallel(1)`. Consuming only the outer stream asserts on
  // nothing, which is how an earlier version of these two tests silently observed empty arrays.
  test('the fork is built from only the ops the predicate selects', () => {
    const seen = [];

    lib.subscribe('save', isArticleOp).sequence().each(op => seen.push(op));
    lib.dispatch('save', OPS);

    expect(seen).toEqual([OPS[0]]);
  });

  test('a predicate selecting nothing yields no ops rather than all of them', () => {
    const seen = [];

    lib.subscribe('delete', () => false).sequence().each(op => seen.push(op));
    lib.dispatch('delete', OPS);

    expect(seen).toEqual([]);
  });

  test('the fork still gets a clone, so mutating it cannot reach the payload', () => {
    const payload = [{ type: 'put', key: 'site.com/_components/article/instances/a', value: '{}' }],
      seen = [];

    lib.subscribe('save', isArticleOp).sequence().each(op => {
      op.value = 'MUTATED';
      seen.push(op);
    });
    lib.dispatch('save', payload);

    expect(seen).toHaveLength(1);
    expect(payload[0].value).toBe('{}');
  });
});
