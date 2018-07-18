'use strict';

const log = require('./log'),
  fakeLog = jest.fn();

describe('services/log', () => {
  describe('init', () => {
    test('it returns if log instance is set', () => {
      log.setLogger(fakeLog);
      log.init();
      expect(fakeLog.mock.calls.length).toBe(0);
    });
  });
});
