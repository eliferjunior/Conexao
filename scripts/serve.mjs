// Tiny zero-dep static server for the Konektra demo.
// Usage: `npm start` or `node scripts/serve.mjs [port]`.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 8080);

const MIME = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml',
  '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp',
  '.ico':'image/x-icon', '.txt':'text/plain; charset=utf-8',
  '.webmanifest':'application/manifest+json',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Referrer-Policy':'strict-origin-when-cross-origin',
};

const srv = http.createServer((req, res) => {
  try{
    const u = new URL(req.url, 'http://localhost');
    let pth = decodeURIComponent(u.pathname);
    if (pth === '/') pth = '/index.html';
    const full = path.normalize(path.join(ROOT, pth));
    if (!full.startsWith(ROOT)){ res.writeHead(403); res.end('forbidden'); return; }
    fs.stat(full, (err, st) => {
      if (err || !st.isFile()){
        const fallback = path.join(ROOT, '404.html');
        fs.stat(fallback, (e2, s2) => {
          if (e2 || !s2.isFile()){ res.writeHead(404, SECURITY_HEADERS); res.end('not found'); return; }
          res.writeHead(404, { 'Content-Type':'text/html; charset=utf-8', ...SECURITY_HEADERS });
          fs.createReadStream(fallback).pipe(res);
        });
        return;
      }
      const ext = path.extname(full).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', ...SECURITY_HEADERS });
      fs.createReadStream(full).pipe(res);
    });
  }catch(e){ res.writeHead(500); res.end('err'); }
});

srv.listen(PORT, () => {
  console.log(`\n  Konektra rodando em http://localhost:${PORT}/\n  Testes:    npm test`);
});
