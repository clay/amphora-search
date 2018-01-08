'use strict';
const _ = require('lodash'),
  h = require('highland'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  { expect } = require('chai');

describe(_.startCase(filename), function () {
  let sandbox, logSpy = sinon.spy();

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    lib.setLog(logSpy);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('subscribe', function () {
    const fn = lib[this.title],
      ops = [{key: 'foo', value: '{ "foo": true}'},{key: 'bar', value: '{ "bar": true}'}],
      saveOps = _.cloneDeep(ops),
      pubOps = {uri: 'foo/uri', ops: _.cloneDeep(ops) },
      modPubOps = _.cloneDeep(ops).map(function (op) { op.pageUri = 'foo/uri'; return op;});

    it('forks a save stream', function () {
      var stream = fn('save');

      lib.saveStream.write(saveOps);
      lib.saveStream.write(h.nil);

      return stream
        .merge()
        .collect()
        .toPromise(Promise)
        .then(function (val) {
          expect(saveOps).to.eql(val);
        });
    });

    it('forks a publish stream', function () {
      var stream = fn('publish');

      lib.publishStream.write(pubOps);
      lib.publishStream.write(h.nil);

      return stream
        .merge()
        .collect()
        .toPromise(Promise)
        .then(function (val) {
          expect(modPubOps).to.eql(val);
        });
    });

    it('logs an error if an invalid event type is passed in', function () {
      fn('foobar');

      sinon.assert.calledOnce(logSpy);
      sinon.assert.calledWith(logSpy, 'error', 'Stream `subscribe` called with an invalid event!');
    });
  });
});
