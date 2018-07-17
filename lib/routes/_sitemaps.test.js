// 'use strict';

// const _ = require('lodash'),
//   filename = __filename.split('/').pop().split('.').shift(),
//   lib = require('./' + filename),
//   expect = require('chai').expect,
//   sinon = require('sinon'),
//   sitemaps = require('../services/sitemaps'),
//   request = require('supertest'),
//   h = require('highland'),
//   express = require('express');

// describe(_.startCase(filename), function () {
//   let sandbox, app;

//   describe ('routes', function () {
//     beforeEach(function () {
//       app = express();
//       app.use((req, res, next) => {
//         res.locals = {site: {slug: 'foo'}};
//         next();
//       });
//       sandbox = sinon.sandbox.create();
//       sandbox.stub(sitemaps, 'sitemapsEnabled');
//       sandbox.stub(sitemaps, 'streamEntries');
//       sandbox.stub(sitemaps, 'renderEntry');
//       sandbox.stub(sitemaps, 'newsSitemapExists');
//       sandbox.stub(sitemaps, 'streamNewsEntries');
//     });

//     afterEach(function () {
//       sandbox.restore();
//     });

//     it ('renders urls at /sitemap.txt if sitemaps are enabled', function () {
//       sitemaps.sitemapsEnabled.returns(true);
//       sitemaps.streamEntries
//         .withArgs('foo', 2014)
//         .returns(h([{loc: 'a'}, {loc: 'b'}]));
//       lib(app);

//       return request(app)
//         .get('/sitemap.txt')
//         .query({year: 2014})
//         .expect(200)
//         .then(response => {
//           expect(response.text).to.equal('a\nb\n');
//         });
//     });

//     it ('defaults to current year at /sitemap.txt if year is not specified in query', function () {
//       sitemaps.sitemapsEnabled.returns(true);
//       sitemaps.streamEntries
//         .withArgs('foo', new Date().getFullYear())
//         .returns(h([{loc: 'a'}, {loc: 'b'}]));
//       lib(app);

//       return request(app)
//         .get('/sitemap.txt')
//         .expect(200)
//         .then(response => {
//           expect(response.text).to.equal('a\nb\n');
//         });
//     });

//     it ('renders standard xml elements at /sitemap.xml if sitemaps are enabled', function () {
//       sitemaps.sitemapsEnabled.returns(true);
//       sitemaps.streamEntries
//         .withArgs('foo', 2014)
//         .returns(h([{url: 'a'}, {url: 'b'}]));
//       sitemaps.renderEntry
//         .onFirstCall().returns('a')
//         .onSecondCall().returns('b');
//       lib(app);

//       return request(app)
//         .get('/sitemap.xml')
//         .query({year: 2014})
//         .expect(200)
//         .then(response => {
//           expect(response.text).to.equal(`${sitemaps.preludes.standard}ab</urlset>`);
//         });
//     });

//     it ('defaults to current year at /sitemap.xml if year is not specified in query', function () {
//       sitemaps.sitemapsEnabled.returns(true);
//       sitemaps.streamEntries
//         .withArgs('foo', new Date().getFullYear())
//         .returns(h([{url: 'a'}, {url: 'b'}]));
//       sitemaps.renderEntry
//         .onFirstCall().returns('a')
//         .onSecondCall().returns('b');
//       lib(app);

//       return request(app)
//         .get('/sitemap.xml')
//         .expect(200)
//         .then(response => {
//           expect(response.text).to.equal(`${sitemaps.preludes.standard}ab</urlset>`);
//         });
//     });

//     it ('404s on /sitemap.txt if sitemaps are not enabled', function () {
//       sitemaps.sitemapsEnabled.returns(false);
//       lib(app);

//       return request(app)
//         .get('/sitemap.txt')
//         .expect(404);
//     });

//     it ('404s on /sitemap.xml if sitemaps are not enabled', function () {
//       sitemaps.sitemapsEnabled.returns(false);

//       return request(app)
//         .get('/sitemap.xml')
//         .expect(404);
//     });

//     it ('shows news xml elements at /news.xml if sitemaps are enabled and news sitemap exists', function () {
//       sitemaps.sitemapsEnabled.returns(true);
//       sitemaps.newsSitemapExists.returns(true);
//       sitemaps.streamNewsEntries.returns(h([1,2]));
//       sitemaps.renderEntry
//         .onFirstCall().returns('a')
//         .onSecondCall().returns('b');
//       lib(app);

//       return request(app)
//         .get('/news.xml')
//         .expect(200)
//         .then(response => {
//           expect(response.text).to.equal(`${sitemaps.preludes.news}ab</urlset>`);
//         });
//     });

//     it ('404s on /news.xml if sitemaps are not enabled', function () {
//       sitemaps.sitemapsEnabled.returns(false);
//       lib(app);
//       return request(app)
//         .get('/news.xml')
//         .expect(404);
//     });

//     it ('404s on /news.xml if news sitemap does not exist', function () {
//       sitemaps.sitemapsEnabled.returns(true);
//       sitemaps.newsSitemapExists.returns(false);
//       lib(app);
//       return request(app)
//         .get('/news.xml')
//         .expect(404);
//     });

//     it ('500s on /sitemap.txt if "year" query param cannot be parsed as a number', function () {
//       sitemaps.sitemapsEnabled.returns(true);
//       lib(app);
//       return request(app)
//         .get('/sitemap.txt')
//         .query({year: 'a'})
//         .expect(500)
//         .then(response => {
//           expect(response.text).to.equal('"year" must be a number');
//         });
//     });

//     it ('500s on /sitemap.xml if "year" query param cannot be parsed as a number', function () {
//       sitemaps.sitemapsEnabled.returns(true);
//       lib(app);
//       return request(app)
//         .get('/sitemap.xml')
//         .query({year: 'a'})
//         .expect(500)
//         .then(response => {
//           expect(response.text).to.equal('"year" must be a number');
//         });
//     });
//   });
// });
