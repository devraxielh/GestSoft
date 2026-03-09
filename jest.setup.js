import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill Response and Request for tests
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.ok = this.status >= 200 && this.status < 300;
    }
    async json() {
      return JSON.parse(this.body);
    }
    static json(data, init) {
      return new Response(JSON.stringify(data), {
        status: init?.status || 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}

if (typeof global.Request === 'undefined') {
  global.Request = class Request {};
}

Object.assign(global, { TextDecoder, TextEncoder })

const fetchMock = require('jest-fetch-mock')
fetchMock.enableMocks()
