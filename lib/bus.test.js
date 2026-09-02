'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  streams = require('./streams'),
  redis = require('redis'),
  subscribeMock = jest.fn(),
  onMock = jest.fn(),
  logMock = jest.fn(),
  { BUS_TOPICS } = require('./constants');

jest.mock('redis');

function setEnvVar(val) {
  process.env.CLAY_BUS_HOST = val;
}

beforeEach(() => {
  lib.setClient(false);
  lib.setLog(logMock);
});

describe(filename, () => {
  describe('init', () => {
    test('it throws if env var is not assigned', () => {
      expect(lib).toThrow(Error);
    });

    test('resolves fast if the client is already established', () => {
      lib.setClient(true);
      setEnvVar('someRedisHost');
      return expect(lib()).resolves.toBe('Already connected');
    });

    test('tries to connect to Redis if we have a url and no client', () => {
      setEnvVar('someRedisHost');
      redis.createClient.mockReturnValue({
        subscribe: subscribeMock,
        on: onMock
      });

      return lib()
        .then(() => {
          expect(redis.createClient).toHaveBeenCalled();
          expect(subscribeMock).toHaveBeenCalledTimes(BUS_TOPICS.length);
          expect(onMock).toHaveBeenCalled();
        });
    });
  });

  // `disperseEvent` parses the payload, applies the same-process gate, and hands off to
  // `streams.dispatch`. What dispatch then does with it -- native handlers, and the legacy
  // Highland stream if anything forked it -- is streams.test.js's business, so these assert on
  // the hand-off rather than on a stream write.
  describe('disperseEvent', () => {
    const objEvent = 'clay:saveUser',
      objString = '{"username": "foo"}',
      batchEvent = 'clay:save',
      batchString = '[{"key": "foo.com/_components/bar"}, {"key": "foo.com/_components/baz"}]';

    beforeEach(() => {
      streams.dispatch = jest.fn();
    });

    test('dispatches one object to the matching topic', () => {
      lib.disperseEvent(objEvent, objString);
      expect(streams.dispatch).toHaveBeenCalledWith(objEvent, JSON.parse(objString));
    });

    test('dispatches a batch once', () => {
      lib.disperseEvent(batchEvent, batchString);
      expect(streams.dispatch).toHaveBeenCalledTimes(1);
      expect(streams.dispatch).toHaveBeenCalledWith(batchEvent, JSON.parse(batchString));
    });

    test('catches JSON.parse error', () => {
      lib.disperseEvent(batchEvent, 'not a JSON string');
      expect(logMock).toHaveBeenCalled();
      expect(streams.dispatch).not.toHaveBeenCalled();
    });

    test('works with the payload of amphora-event-bus-redis', () => {
      const msg = { foo: 'bar' },
        eventBusData = {
          hostname: require('os').hostname(),
          pid: process.pid,
          msg
        };

      lib.disperseEvent(objEvent, JSON.stringify(eventBusData));
      expect(streams.dispatch).toHaveBeenCalledWith(objEvent, msg);
    });

    test('does not works with the payload of amphora-event-bus-redis if pid or host do not match', () => {
      const msg = { foo: 'bar' },
        eventBusData = {
          hostname: require('os').hostname() + 1,
          pid: process.pid + 1,
          msg
        };

      lib.disperseEvent(objEvent, JSON.stringify(eventBusData));
      expect(streams.dispatch).not.toHaveBeenCalled();
    });
  });
});
