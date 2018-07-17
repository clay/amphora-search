'use strict';

module.exports = {
  verbose: true,
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    '!coverage/**',
    '!**/node_modules/**',
    '!*.config.js',
    '!index.js',
    '!_book/**',
    '**/*.js'
  ],
  coverageDirectory: 'coverage'
};
