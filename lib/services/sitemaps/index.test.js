'use strict';
/* eslint max-nested-callbacks:[2,5] */

var _ = require('lodash'),
  expect = require('chai').expect,
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  setup = require('../../setup');

describe(_.startCase(filename), function () {
  describe('customSitemapExists', function () {
    const fn = lib[this.title];

    it ('returns true if a mapping and handler for a custom sitemap index exists', function () {
      setup.mappings['sitemap-entries'] = {};
      setup.handlers['sitemap-entries'] = {};
      expect(fn()).to.be.true;
    });
    it ('returns false if a mapping exists with no handler', function () {
      setup.mappings['sitemap-entries'] = {};
      setup.handlers['sitemap-entries'] = null;
      expect(fn()).to.be.false;
    });
    it ('returns false if a handler exists with no mapping', function () {
      setup.mappings['sitemap-entries'] = null;
      setup.handlers['sitemap-entries'] = {};
      expect(fn()).to.be.false;
    });
    it ('returns false if neither handler nor mapping exists', function () {
      setup.mappings['sitemap-entries'] = null;
      setup.handlers['sitemap-entries'] = null;
      expect(fn()).to.be.false;
    });
  });
  describe('newsSitemapExists', function () {
    const fn = lib[this.title];

    it ('returns true if a mapping and handler for a custom news sitemap index exists', function () {
      setup.mappings['news-sitemap-entries'] = {};
      setup.handlers['news-sitemap-entries'] = {};
      expect(fn()).to.be.true;
    });
    it ('returns false if a mapping exists with no handler', function () {
      setup.mappings['news-sitemap-entries'] = {};
      setup.handlers['news-sitemap-entries'] = null;
      expect(fn()).to.be.false;
    });
    it ('returns false if a handler exists with no mapping', function () {
      setup.mappings['news-sitemap-entries'] = null;
      setup.handlers['news-sitemap-entries'] = {};
      expect(fn()).to.be.false;
    });
    it ('returns false if neither handler nor mapping exists', function () {
      setup.mappings['news-sitemap-entries'] = null;
      setup.handlers['news-sitemap-entries'] = null;
      expect(fn()).to.be.false;
    });
  });
  describe('sitemapsEnabled', function () {
    const fn = lib[this.title];

    it ('returns true if amphoraSearch is configured to handle sitemaps', function () {
      setup.options = { sitemaps: true};
      expect(fn()).to.be.true;
    });
    it ('returns false if amphoraSearch is not configured to handle sitemaps', function () {
      setup.options = { sitemaps: false};
      expect(fn()).to.be.false;
      setup.options = {};
      expect(fn()).to.be.false;
    });
  });
});
