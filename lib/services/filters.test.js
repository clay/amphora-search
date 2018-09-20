'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename);

describe(filename, () => {
  describe('filterRefs', () => {
    test('takes an operation and removes refs from it', () => {
      let op = {
        type: 'put',
        key: 'www.vulture.com/_components/article/instances/section-test',
        value: { primaryHeadline: 'some headline', _ref: 'Reference thing' }
      };

      expect(lib.filterRefs(op)).not.toHaveProperty('_ref');
    });
  });

  describe('isInstanceOp', () => {
    const fn = lib.isInstanceOp;

    test('takes an operation and returns true if its key is an article component ref', () => {
      expect(fn({
        key: 'www.vulture.com/_components/article/instances/section-test'
      })).toBe(true);
    });

    test('takes an operation and returns false if its key is not an article component ref', () => {
      expect(fn({
        key: 'www.vulture.com/_components/sailthru-personalization-pixel'
      })).toBe(false);
    });
  });

  describe('isPageOp', () => {
    const fn = lib.isPageOp;

    test('takes an operation and returns true if its key is a page ref', () => {
      expect(fn({
        key: 'www.nymag.com/scienceofus/_pages/cit0k8p6x0000r7reetki2i6k@published'
      })).toBe(true);
    });

    test('takes an operation and returns false if its key is not a page ref', () => {
      expect(fn({
        key: 'www.vulture.com/_components/sailthru-personalization-pixel'
      })).toBe(false);
    });
  });

  describe('isPutOp', () => {
    const fn = lib.isPutOp;

    test('takes an operation and returns true if its type is a put operation', function () {
      expect(fn({
        type: 'put'
      })).toBe(true);
    });

    test('takes an operation and returns false if its key is not a put operation', function () {
      expect(fn({
        type: 'get'
      })).toBe(false);
    });
  });

  describe('isPublished', () => {
    const fn = lib.isPublished;

    test('takes an operation and returns true if its key has a published ref', function () {
      expect(fn({
        key: 'www.nymag.com/scienceofus/_pages/cit0k8p6x0000r7reetki2i6k@published'
      })).toBe(true);
    });

    test('takes an operation and returns false if its key does not have a published ref', function () {
      expect(fn({
        key: 'www.vulture.com/_components/sailthru-personalization-pixel'
      })).toBe(false);
    });
  });
});
