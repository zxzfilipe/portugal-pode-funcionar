// Servidor estático mínimo, para ver o site e correr as verificações: node scripts/servir.mjs [pasta] [porta]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.ico': 'image/x-icon' };

export function servir(raiz, porta = 0) {
  raiz = path.resolve(raiz);
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(raiz, p);
    if (!f.startsWith(raiz)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { const nf = path.join(raiz, '404.html'); res.writeHead(404, { 'content-type': TIPOS['.html'] }); res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'não encontrado'); return; }
    const tipo = TIPOS[path.extname(f)] || 'application/octet-stream';
    // texto vai comprimido, como no GitHub Pages
    if (/text|json|svg|xml/.test(tipo) && /gzip/.test(req.headers['accept-encoding'] || '')) {
      res.writeHead(200, { 'content-type': tipo, 'content-encoding': 'gzip', 'cache-control': 'max-age=600' });
      res.end(zlib.gzipSync(fs.readFileSync(f))); return;
    }
    res.writeHead(200, { 'content-type': tipo, 'cache-control': 'max-age=600' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(ok => srv.listen(porta, '127.0.0.1', () => ok({ srv, url: `http://127.0.0.1:${srv.address().port}` })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { url } = await servir(process.argv[2] || 'dist', +(process.argv[3] || 4173));
  console.log(`a servir ${process.argv[2] || 'dist'} em ${url}`);
}
