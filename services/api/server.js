'use strict';
/* Servidor local de desarrollo: API en /api/* y, si existe, la SPA de apps/corporativo en /.
 * Uso: APIH_AUTH=dev node services/api/server.js   (puerto 7071 o $PORT) */
const http = require('http'), fs = require('fs'), path = require('path');
const crearApi = require('./src/index');
const api = crearApi(process.env), PORT = +process.env.PORT || 7071;
const SPA = path.join(__dirname, '..', '..', 'apps', 'corporativo');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    let raw = ''; for await (const c of req) raw += c;
    let body = null; if (raw) { try { body = JSON.parse(raw); } catch (e) { res.writeHead(400, { 'content-type': 'application/json' }); return res.end('{"codigo":"INVALIDA","mensaje":"JSON inválido"}'); } }
    const r = await api.handle({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), headers: req.headers, body });
    res.writeHead(r.status, r.headers); return res.end(r.body);
  }
  const f = path.join(SPA, path.normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!f.startsWith(SPA) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('No encontrado'); }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('APIH Corporativo local en http://localhost:' + PORT + (process.env.APIH_AUTH === 'dev' ? ' (auth dev)' : '')));
