const http = require('http');
const qs = require('querystring');

function request(port, method, path, { headers = {}, bodyObj } = {}) {
  return new Promise((resolve, reject) => {
    let bodyStr = null;
    if (bodyObj) {
      bodyStr = qs.stringify(bodyObj);
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    const req = http.request({ host: 'localhost', port, method, path, headers }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function extractCsrf(html) {
  const m = /name="_csrf" value="([^"]+)/.exec(html);
  return m && m[1];
}

module.exports = { request, extractCsrf };
