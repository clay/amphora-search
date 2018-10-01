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
    pageList.setPagesIndex = jest.fn();
    layoutList.setLayoutsIndex = jest.fn();
    userList.setUserIndex = jest.fn();
    sitesList.create = jest.fn().mockResolvedValue();

    return lib()
      .then(() => {
        expect(pageList.setPagesIndex).toHaveBeenCalled();
        expect(layoutList.setLayoutsIndex).toHaveBeenCalled();
        expect(userList.setUserIndex).toHaveBeenCalled();
        expect(sitesList.create).toHaveBeenCalled();
      });
  });

  describe('handleMetaSave', () => {
    test('it calls the update function for the layout list', () => {
      layoutList.updateLayout.mockResolvedValue();
      return lib.handleMetaSave({ uri: 'foo.com/_layouts/foo/instances/bar', data: {}})
        .toPromise(Promise)
        .then(() => {
          expect(layoutList.updateLayout).toHaveBeenCalled();
        });
    });

    test('it calls the update function for the page list', () => {
      pageList.updatePage.mockResolvedValue();
      return lib.handleMetaSave({ uri: 'foo.com/_pages/foo', data: {}})
        .toPromise(Promise)
        .then(() => {
          expect(pageList.updatePage).toHaveBeenCalled();
        });
    });
  });

  describe('handleErrors', () => {
    test('it logs an error', () => {
      lib.handleErrors(new Error('bad thing happened'));
      expect(logMock).toHaveBeenCalledWith('error', 'Error processing document update', { msg: 'bad thing happened' });
    });
  });

  describe('logStatus', () => {
    test('it logs the result of an Elastic update', () => {
      lib.logStatus({ _id: 'foo', result: 'success' });
      expect(logMock).toHaveBeenCalledWith('debug', 'Document success', { _id: 'foo' });
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
