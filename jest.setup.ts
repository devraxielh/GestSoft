import 'whatwg-fetch'
import { TextEncoder, TextDecoder } from 'util'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

// Let's use standard global fetch objects if we can, wait node doesn't have them before node 18
// Whatwg-fetch defines them on global object, but let's make sure NextResponse can use them

class MockResponse {
  status: number;
  body: any;
  constructor(body: any, init?: any) {
    this.status = init?.status || 200;
    this.body = body;
  }
  json() {
    return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body);
  }
  text() {
    return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body));
  }
  static json(data: any, init?: any) {
    return new MockResponse(data, init);
  }
}

global.Response = MockResponse as any

class MockRequest {
  url: string;
  headers: Headers;
  constructor(url: string, init?: any) {
    this.url = url;
    this.headers = new Headers(init?.headers);
  }
}

global.Request = MockRequest as any
global.Headers = Headers as any
