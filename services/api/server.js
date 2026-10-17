'use strict';
/* Servidor local de desarrollo: API en /api/* y la SPA de apps/corporativo en /.
 * Simula Azure Static Web Apps: con APIH_DEV_USER (y APIH_DEV_ROL = Admin|Editor|Lectura) responde /.auth/me
 * e inyecta x-ms-client-principal en /api, así la API usa el MISMO camino de autenticación que en Azure.
 * Uso: APIH_DEV_USER=nombre.apellido@aramark.cl APIH_DEV_ROL=Editor node services/api/server.js  (puerto 7071 o $PORT) */
const http = require('http'), fs = require('fs'), path = require('path');
const crearApi = require('./src/index');
const api = crearApi(process.env), PORT = +process.env.PORT || 7071;
const SPA = path.join(__dirname, '..', '..', 'apps', 'corporativo');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const DEV = process.env.APIH_DEV_USER, ROL = (process.env.APIH_DEV_ROL || 'Editor').toLowerCase();
  const principal = DEV ? { identityProvider: 'aad', userId: 'dev', userDetails: DEV, userRoles: ['anonymous', 'authenticated', 'apih-' + ROL] } : null;
  if (url.pathname === '/.auth/me') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ clientPrincipal: principal })); }
  if (/^\/\.auth\/(login|logout)/.test(url.pathname)) { res.writeHead(302, { location: url.searchParams.get('post_login_redirect_uri') || '/' }); return res.end(); }
  if (url.pathname.startsWith('/api/')) {
    if (principal) req.headers['x-ms-client-principal'] = Buffer.from(JSON.stringify(principal)).toString('base64');
    let raw = '', big = false; for await (const c of req) { raw += c; if (raw.length > 2e6) { big = true; break; } }
    if (big) { res.writeHead(413, { 'content-type': 'application/json' }); return res.end('{"codigo":"INVALIDA","mensaje":"Solicitud demasiado grande (máx. 2 MB)"}'); }
    let body = null; if (raw) { try { body = JSON.parse(raw); } catch (e) { res.writeHead(400, { 'content-type': 'application/json' }); return res.end('{"codigo":"INVALIDA","mensaje":"JSON inválido"}'); } }
    const r = await api.handle({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), headers: req.headers, body });
    res.writeHead(r.status, r.headers); return res.end(r.body);
  }
  const f = path.join(SPA, path.normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!f.startsWith(SPA) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('No encontrado'); }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('APIH Corporativo local en http://localhost:' + PORT + (process.env.APIH_DEV_USER ? ' · sesión simulada: ' + process.env.APIH_DEV_USER + ' (' + (process.env.APIH_DEV_ROL || 'Editor') + ')' : '')));
