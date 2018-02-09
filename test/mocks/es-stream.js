'use strict';

const stream = require('stream');

// See https://www.npmjs.com/package/elasticsearch-scroll-stream

module.exports = class TestEsStream extends stream.Readable {
  constructor(docs) {
    super();
    this.docs = docs;
    this.streamed = 0;
  }
  _read() {
    if (this.streamed < this.docs.length) {
      this.push(JSON.stringify(this.docs[this.streamed]));
      this.streamed++;
    } else {
      return this.push(null);
    }
  }
  close() {
    this.destroy();
  }
};
