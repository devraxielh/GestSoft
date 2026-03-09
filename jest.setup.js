import '@testing-library/jest-dom'

// Mock Response and Request from cross-fetch to support Next.js Response methods like .json()
const { Request, Response, Headers } = require('cross-fetch')

if (typeof global.Request === 'undefined') {
  global.Request = Request;
}

if (typeof global.Response === 'undefined') {
  global.Response = Response;
}

if (typeof global.Headers === 'undefined') {
  global.Headers = Headers;
}

// Ensure Response.json is available (native in newer Node versions, Next.js relies on it)
if (!global.Response.json) {
  global.Response.json = function(data, init = {}) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {})
      }
    });
  }
}
