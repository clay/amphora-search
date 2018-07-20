'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename);

describe(filename, () => {
  describe('subscribe', () => {
    test('logs an error if the event does not exist in the BUS_TOPICS manifest', () => {
      expect(() => lib.subscribe('foo')).toThrow(Error);
    });

    test('it clones ops for save and delete to prefent mutations', () => {
      _.cloneDeep = jest.fn(); // Mock the cloneDeep function
      lib.subscribe('save').each(() => {}); // Make sure the stream is consumed
      lib['clay:save'].write({}); // Write something to the stream
      expect(_.cloneDeep).toHaveBeenCalled();
    });
  });
});