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

/**
 * Build a mock dedupe client whose `set` resolves the claim in a given way.
 *
 * @param {String} outcome - 'win' | 'lose' | 'error'
 * @returns {Object} a stand-in for the Redis claim connection
 */
function claimResponder(outcome) {
  return {
    set: jest.fn((...args) => {
      const cb = args[args.length - 1]; // redis `set` always takes the callback last

      if (outcome === 'error') {
        return cb(new Error('redis unavailable'));
      }

      return cb(null, outcome === 'win' ? 'OK' : null);
    })
  };
}

beforeEach(() => {
  lib.setClient(false);
  lib.setDedupeClient(false);
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

    test('processes a scoped amphora-event-bus-redis payload when it wins the claim', () => {
      const msg = { foo: 'bar' },
        eventBusData = { hostname: 'some-pod', pid: 1, msg };

      lib.setDedupeClient(claimResponder('win'));
      streams[objEvent].write = jest.fn();
      lib.disperseEvent(objEvent, JSON.stringify(eventBusData));
      expect(streams[objEvent].write).toHaveBeenCalledWith(msg);
    });

    test('skips a scoped payload when another replica already claimed it', () => {
      const msg = { foo: 'bar' },
        eventBusData = { hostname: 'some-pod', pid: 1, msg };

      lib.setDedupeClient(claimResponder('lose'));
      streams[objEvent].write = jest.fn();
      lib.disperseEvent(objEvent, JSON.stringify(eventBusData));
      expect(streams[objEvent].write).not.toHaveBeenCalled();
    });

    test('claims using a stable key derived from the payload', () => {
      const dedupe = claimResponder('win'),
        msg = { foo: 'bar' },
        eventBusData = { hostname: 'some-pod', pid: 1, msg },
        payload = JSON.stringify(eventBusData);

      lib.setDedupeClient(dedupe);
      streams[objEvent].write = jest.fn();
      lib.disperseEvent(objEvent, payload);
      // Same payload bytes must always hash to the same claim key so the
      // pub/sub fan-out collapses to a single processor across replicas.
      expect(dedupe.set.mock.calls[0][0]).toBe(`amphora-search:dedupe:${objEvent}:${require('crypto').createHash('sha1').update(payload).digest('hex')}`);
    });

    test('fails open (processes) when the claim lock errors', () => {
      const msg = { foo: 'bar' },
        eventBusData = { hostname: 'some-pod', pid: 1, msg };

      lib.setDedupeClient(claimResponder('error'));
      streams[objEvent].write = jest.fn();
      lib.disperseEvent(objEvent, JSON.stringify(eventBusData));
      expect(streams[objEvent].write).toHaveBeenCalledWith(msg);
      expect(logMock).toHaveBeenCalled();
    });

    test('fails open (processes) a scoped payload when no dedupe client is configured', () => {
      const msg = { foo: 'bar' },
        eventBusData = { hostname: 'some-pod', pid: 1, msg };

      lib.setDedupeClient(false);
      streams[objEvent].write = jest.fn();
      lib.disperseEvent(objEvent, JSON.stringify(eventBusData));
      expect(streams[objEvent].write).toHaveBeenCalledWith(msg);
    });
  });
});
