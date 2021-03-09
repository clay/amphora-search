'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sitesList = require('./sites-list'),
  userList = require('./user-list'),
  layoutList = require('./layout-list'),
  pageList = require('./page-list'),
  streams = require('../streams'),
  logMock = jest.fn();

pageList.updatePage = jest.fn();
layoutList.updateLayout = jest.fn();
streams.subscribe = jest.fn();

beforeEach(() => {
  lib.setLog(logMock);
});

describe(filename, () => {
  describe('setup', () => {
    sitesList.create = jest.fn().mockResolvedValue();

    return lib()
      .then(() => {
        expect(sitesList.create).toHaveBeenCalled();
      });
  });

  describe('setSubscribers', () => {
    test('it does not subscribe to bus topics if false', () => {
      lib.setInternal(false);
      lib.setSubscribers();
      expect(streams.subscribe).not.toHaveBeenCalled();
    });
  });
});
