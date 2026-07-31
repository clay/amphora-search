'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  logMock = jest.fn();

beforeEach(() => {
  lib.reset();
  lib.setLog(logMock);
});

/**
 * A no-op handler, as a named function so the assertions below don't nest another arrow inside
 * an `expect(() => ...)` and trip max-nested-callbacks.
 */
function noop() {}

/**
 * A handler that resolves on a later tick, used to show `dispatch` doesn't await. Declared at
 * module scope for the same lint reason.
 *
 * @param {Object} flag - mutated to `{ resolved: true }` once the promise settles
 * @returns {Function}
 */
function deferredHandler(flag) {
  return () => new Promise(resolve => setImmediate(() => {
    flag.resolved = true;
    resolve();
  }));
}

describe(filename, () => {
  describe('subscribe', () => {
    test('logs an error if the event does not exist in the BUS_TOPICS manifest', () => {
      expect(() => lib.subscribe('foo')).toThrow(Error);
    });

    test('it clones ops for save and delete to prefent mutations', () => {
      // Restored in `finally`: this replaces cloneDeep on the shared lodash module, so leaving
      // it mocked makes every later test in this file receive `undefined` wherever streams.js
      // clones a payload.
      const realCloneDeep = _.cloneDeep;

      _.cloneDeep = jest.fn(); // Mock the cloneDeep function

      try {
        lib.subscribe('save').each(() => {}); // Make sure the stream is consumed
        lib['clay:save'].write({}); // Write something to the stream
        expect(_.cloneDeep).toHaveBeenCalled();
      } finally {
        _.cloneDeep = realCloneDeep;
      }
    });
  });

  describe('on', () => {
    test('throws on an event that is not in the BUS_TOPICS manifest', () => {
      expect(() => lib.on('foo', noop)).toThrow(Error);
    });

    test('throws if the handler is not a function', () => {
      expect(() => lib.on('save', 'not a function')).toThrow(Error);
    });

    test('registers a handler that dispatch then calls', () => {
      const handler = jest.fn();

      lib.on('save', handler);
      lib.dispatch('save', [{ key: 'foo' }]);

      expect(handler).toHaveBeenCalledWith([{ key: 'foo' }]);
    });

    test('calls every handler registered for a topic', () => {
      const first = jest.fn(),
        second = jest.fn();

      lib.on('save', first);
      lib.on('save', second);
      lib.dispatch('save', ['op']);

      expect(first).toHaveBeenCalled();
      expect(second).toHaveBeenCalled();
    });

    test('does not call a handler registered for a different topic', () => {
      const saveHandler = jest.fn();

      lib.on('save', saveHandler);
      lib.dispatch('unpublishPage', { uri: 'foo' });

      expect(saveHandler).not.toHaveBeenCalled();
    });
  });

  describe('dispatch', () => {
    test('throws on an unknown topic', () => {
      expect(() => lib.dispatch('foo', {})).toThrow(Error);
    });

    // Each consumer gets its own copy, matching the per-fork cloneDeep `subscribe` does. Two
    // handlers on one topic must not be able to see each other's mutations.
    test('gives each handler its own deep clone of the payload', () => {
      const payload = { nested: { count: 0 } };
      let seenBySecond;

      lib.on('saveMeta', received => { received.nested.count = 99; });
      lib.on('saveMeta', received => { seenBySecond = received.nested.count; });
      lib.dispatch('saveMeta', payload);

      expect(seenBySecond).toBe(0);
      expect(payload.nested.count).toBe(0);
    });

    test('a throwing handler is logged and does not stop the handlers after it', () => {
      const after = jest.fn();

      lib.on('save', () => { throw new Error('handler blew up'); });
      lib.on('save', after);

      expect(() => lib.dispatch('save', ['op'])).not.toThrow();
      expect(after).toHaveBeenCalled();
      expect(logMock).toHaveBeenCalled();
    });

    test('a rejecting handler is logged and does not surface to the caller', () => {
      lib.on('save', () => Promise.reject(new Error('async handler failed')));

      expect(() => lib.dispatch('save', ['op'])).not.toThrow();

      // let the rejection settle before asserting on the log
      return Promise.resolve().then(() => {
        expect(logMock).toHaveBeenCalledWith(
          'error',
          expect.stringContaining('async handler failed'),
          expect.any(Object)
        );
      });
    });

    test('does not wait for a handler that returns a promise', () => {
      const flag = { resolved: false };

      lib.on('save', deferredHandler(flag));
      lib.dispatch('save', ['op']);

      expect(flag.resolved).toBe(false);
    });

    test('writes to the legacy stream once something has forked it', () => {
      const write = jest.fn();

      lib.subscribe('save');
      lib['clay:save'].write = write;
      lib.dispatch('save', ['op']);

      expect(write).toHaveBeenCalledWith(['op']);
    });

    // The behaviour change called out in dispatch's docblock: an unforked Highland stream
    // buffers everything written to it for the life of the process, and the bus subscribes to
    // every topic whether or not anyone consumes it.
    test('does not write to a legacy stream nothing has forked', () => {
      const write = jest.fn();

      lib['clay:createPage'].write = write;
      lib.dispatch('createPage', { uri: 'foo' });

      expect(write).not.toHaveBeenCalled();
    });

    test('still reaches native handlers for a topic with no legacy fork', () => {
      const handler = jest.fn();

      lib.on('createPage', handler);
      lib.dispatch('createPage', { uri: 'foo' });

      expect(handler).toHaveBeenCalled();
    });

    test('feeds native handlers and the legacy stream from the same event', () => {
      const handler = jest.fn(),
        write = jest.fn();

      lib.on('save', handler);
      lib.subscribe('save');
      lib['clay:save'].write = write;
      lib.dispatch('save', ['op']);

      expect(handler).toHaveBeenCalled();
      expect(write).toHaveBeenCalled();
    });
  });

  // The bus hands dispatch a namespaced topic (`clay:save`) because that is what it subscribed
  // to, while BUS_TOPICS and the handler manifest use the bare name. Both must work everywhere.
  describe('namespaced topics', () => {
    test('dispatch accepts a namespaced topic for a bare registration', () => {
      const handler = jest.fn();

      lib.on('save', handler);
      lib.dispatch('clay:save', ['op']);

      expect(handler).toHaveBeenCalledWith(['op']);
    });

    test('on accepts a namespaced topic for a bare dispatch', () => {
      const handler = jest.fn();

      lib.on('clay:save', handler);
      lib.dispatch('save', ['op']);

      expect(handler).toHaveBeenCalledWith(['op']);
    });

    test('subscribe accepts a namespaced topic and forks the same stream', () => {
      const write = jest.fn();

      lib.subscribe('clay:save');
      lib['clay:save'].write = write;
      lib.dispatch('save', ['op']);

      expect(write).toHaveBeenCalledWith(['op']);
    });

    test('stripNamespace leaves a bare topic alone', () => {
      expect(lib.stripNamespace('save')).toBe('save');
      expect(lib.stripNamespace('clay:save')).toBe('save');
    });

    test('a namespaced unknown topic still throws', () => {
      expect(() => lib.dispatch('clay:nope', {})).toThrow(Error);
    });
  });

  describe('hasSubscribers', () => {
    test('is false for a topic nobody is listening to', () => {
      expect(lib.hasSubscribers('delete')).toBe(false);
    });

    test('is true once a native handler is registered', () => {
      lib.on('delete', noop);
      expect(lib.hasSubscribers('delete')).toBe(true);
    });

    test('is true once the legacy stream is forked', () => {
      lib.subscribe('delete');
      expect(lib.hasSubscribers('delete')).toBe(true);
    });
  });
});
