'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sitesList = require('./sites-list'),
  userList = require('./user-list'),
  layoutList = require('./layout-list'),
  pageList = require('./page-list'),
  logMock = jest.fn();

pageList.updatePage = jest.fn();
layoutList.updateLayout = jest.fn();

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

  describe('logStatus', () => {
    test('it logs an error if one is passed in', () => {
      lib.logStatus(new Error('foo'));
      expect(logMock).toHaveBeenCalledWith('error', 'foo');
    });

    test('it logs the result of an Elastic update', () => {
      lib.logStatus({ _id: 'foo', result: 'success' });
      expect(logMock).toHaveBeenCalledWith('debug', 'Document success', { _id: 'foo' });
    });
  });
});