/** Local server uses the same authenticated API handlers as production. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const handlers = { '/api/auth': require('./api/auth'), '/api/pair': require('./api/pair'), '/api/state': require('./api/state'), '/api/photo': require('./api/photo') };
const assets = {
  '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'],
  '/app.js': ['app.js', 'application/javascript'], '/auth.js': ['auth.js', 'application/javascript'],
  '/sw.js': ['sw.js', 'application/javascript'], '/styles.css': ['styles.css', 'text/css'],
  '/icon.svg': ['icon.svg', 'image/svg+xml'], '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json']
};
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const handler = handlers[pathname];
    if (handler) {
      if (req.method === 'POST' && pathname !== '/api/photo') {
        let size = 0;
        const chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 4 * 1024 * 1024) { res.writeHead(413); res.end(); return; }
          chunks.push(chunk);
        }
        try { req.body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
        catch (_) { res.writeHead(400); res.end(); return; }
      }
      await handler(req, res);
      return;
    }
    const asset = assets[pathname];
    if (!asset || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': asset[1] + '; charset=utf-8', 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') res.end();
    else fs.createReadStream(path.join(__dirname, asset[0])).pipe(res);
  } catch (_) { if (!res.headersSent) res.writeHead(500); res.end('Server error'); }
});
if (require.main === module) server.listen(Number(process.env.PORT || 4173), '0.0.0.0', () => console.log('Couple app: http://localhost:' + (process.env.PORT || 4173)));
module.exports = server;
