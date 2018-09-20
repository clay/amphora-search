'use strict';

const filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename);

describe(filename, () => {
  test('it assigns the storage module to `exports`', () => {
    return lib('test')
      .then(() => expect(lib).toHaveProperty('db', 'test'));
  });
});
