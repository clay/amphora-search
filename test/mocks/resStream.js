'use strict';

const _ = require('lodash'),
  h = require('highland');
  // Transform = require('stream').Transform;

module.exports = function (options) {
  var res = h();

  options = options || {};

  // mock these methods
  res.status = _.constant(res);
  res.send = _.constant(res);
  res.redirect = _.noop;
  res.json = function (json) {
    res.type('json');
    res.send(json);
    return res;
  };
  res.type = _.constant(res);
  res.set = _.constant(res);
  res.pipe = _.constant(res);
  res.locals = {};

  // send status is a shortcut of express, pretend they're sending for testing ease
  res.sendStatus = function (code) {
    res.status(code);
    res.send('sendStatus: whatever');
    return res;
  };

  // options selects a formatter
  res.format = function (formatters) {
    formatters[options.formatter || 'default']();
    return res;
  };
  return res;
};
