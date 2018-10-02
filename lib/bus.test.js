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

  describe('disperseEvent', () => {
    const objEvent = 'clay:saveUser',
      objString = '{"username": "foo"}',
      batchEvent = 'clay:save',
      batchString = '[{"key": "foo.com/_components/bar"}, {"key": "foo.com/_components/baz"}]';

    test('writes to the appropriate stream with one object', () => {
      streams[objEvent].write = jest.fn();
      lib.disperseEvent(objEvent, objString);
      expect(streams[objEvent].write).toHaveBeenCalledWith(JSON.parse(objString));
    });

    test('writes to the appropriate streams', () => {
      streams[batchEvent].write = jest.fn();
      lib.disperseEvent(batchEvent, batchString);
      expect(streams[batchEvent].write).toHaveBeenCalledTimes(1);
    });

    test('catches JSON.parse error', () => {
      streams[batchEvent].write = jest.fn();
      lib.disperseEvent(batchEvent, 'not a JSON string');
      expect(logMock).toHaveBeenCalled();
      expect(streams[batchEvent].write).not.toHaveBeenCalled();
    });

    test('works with the payload of amphora-event-bus-redis', () => {
      const msg = { foo: 'bar' },
        eventBusData = {
          hostname: require('os').hostname(),
          pid: process.pid,
          msg
        };

      streams[objEvent].write = jest.fn();
      lib.disperseEvent(objEvent, JSON.stringify(eventBusData));
      expect(streams[objEvent].write).toHaveBeenCalledWith(msg);
    });

    test('does not works with the payload of amphora-event-bus-redis if pid or host do not match', () => {
      const msg = { foo: 'bar' },
        eventBusData = {
          hostname: require('os').hostname() + 1,
          pid: process.pid + 1,
          msg
        };

      streams[objEvent].write = jest.fn();
      lib.disperseEvent(objEvent, JSON.stringify(eventBusData));
      expect(streams[objEvent].write).not.toHaveBeenCalledWith(msg);
    });
  });
});
