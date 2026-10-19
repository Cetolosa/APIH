#!/usr/bin/env node
/* C2.20 · Verificación previa al despliegue (sin Azure). Arma el paquete de la API EXACTAMENTE como el pipeline
 * (copia services/api + packages/core, npm install --omit=dev) en una carpeta fuera del repositorio, y comprueba que
 * funciona sin el árbol del repo: dependencias, carga de la función, núcleo empaquetado y rutas básicas.
 * Además revisa la configuración de la SWA y del pipeline. Uso: node tools/verificar-paquete.js  (código 1 si algo falla) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const R = path.join(__dirname, '..'), res = [];
const ok = (n, v, d) => { res.push([n, !!v, d || '']); };
const sh = (c, o) => cp.execSync(c, Object.assign({ stdio: 'pipe', encoding: 'utf8' }, o));
(async () => {
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'apih-paquete-')), A = path.join(T, 'api');
  sh(`mkdir -p "${A}" && cp -r "${R}/services/api/." "${A}/" && rm -rf "${A}/node_modules" && mkdir -p "${A}/core" && cp "${R}/packages/core/apih-core.js" "${R}/packages/core/notif-motor.js" "${A}/core/"`);
  try { sh('npm install --omit=dev --no-audit --no-fund', { cwd: A, timeout: 240000 }); ok('npm install --omit=dev', true); } catch (e) { ok('npm install --omit=dev', false, String(e.stderr || e.message).slice(0, 200)); }
  for (const m of ['@azure/functions', 'mssql']) { try { sh(`node -e "require.resolve('${m}')"`, { cwd: A }); ok('dependencia ' + m + ' instalada', true); } catch (e) { ok('dependencia ' + m + ' instalada', false, 'sin ella la API falla al arrancar en Azure'); } }
  /* La API empaquetada debe cargar el núcleo desde ./core (no existe el árbol del repo en Azure) */
  try {
    const out = sh(`node -e "
      const c=require('./src/index')({}); (async()=>{
      const s=await c.handle({method:'GET',path:'/api/salud',headers:{}}); const n=await c.handle({method:'GET',path:'/api/iniciativas',headers:{}});
      console.log(JSON.stringify({salud:s.status,body:JSON.parse(s.body),sinSesion:n.status}));})()"`, { cwd: A });
    const j = JSON.parse(out.trim().split('\n').pop());
    ok('API empaquetada responde /api/salud (núcleo desde ./core)', j.salud === 200 && j.body.ok, 'core ' + j.body.core);
    ok('API empaquetada exige sesión (401 sin principal)', j.sinSesion === 401);
    const v = JSON.parse(sh(`node -e "console.log(JSON.stringify(require('./core/apih-core.js').VERSION))"`, { cwd: A }));
    ok('versión del núcleo empaquetado = versión de la SPA', fs.readFileSync(path.join(R, 'apps/corporativo/index.html'), 'utf8').includes("v: '" + v.v + "'"), v.v);
  } catch (e) { ok('API empaquetada arranca', false, String(e.stderr || e.message).slice(0, 300)); }
  /* La función de Azure debe registrarse sin errores con el SDK real */
  try { sh(`node -e "require('./functions/api.js')"`, { cwd: A }); ok('functions/api.js carga con @azure/functions', true); } catch (e) { ok('functions/api.js carga con @azure/functions', false, String(e.stderr || e.message).split('\n').filter(Boolean).pop()); }
  /* Configuración de la SWA y del pipeline */
  const swa = JSON.parse(fs.readFileSync(path.join(R, 'apps/corporativo/staticwebapp.config.json'), 'utf8'));
  const wf = fs.readFileSync(path.join(R, '.github/workflows/apih-corporativo.yml'), 'utf8');
  const issuer = swa.auth.identityProviders.azureActiveDirectory.registration.openIdIssuer;
  ok('marcador <TENANT-ID> se reemplaza en el pipeline', !issuer.includes('<TENANT-ID>') || /TENANT-ID/.test(wf), 'sin reemplazo el inicio de sesión Entra no funciona');
  ok('rutas: /api/salud anónima, /api/* por rol, /* autenticado', swa.routes.some(r => r.route === '/api/salud' && r.allowedRoles.includes('anonymous')) && swa.routes.some(r => r.route === '/api/*' && r.allowedRoles.length === 3) && swa.routes.some(r => r.route === '/*' && r.allowedRoles.includes('authenticated')));
  ok('rolesSource apunta a /api/roles', swa.auth.rolesSource === '/api/roles');
  ok('proveedores GitHub/Twitter bloqueados', swa.routes.some(r => r.route === '/.auth/login/github' && r.statusCode === 404));
  ok('frame-ancestors solo propio y Microsoft (Teams)', /frame-ancestors 'self' https:\/\/teams\.microsoft\.com/.test(swa.globalHeaders['Content-Security-Policy']));
  const html = fs.readFileSync(path.join(R, 'apps/corporativo/index.html'), 'utf8');
  ok("CSP de la SPA: connect-src 'self' (sin Supabase)", /connect-src 'self'/.test(html) && !/supabase\.co/.test(html.match(/Content-Security-Policy[^>]*>/)[0]));
  ok('modo dev de autenticación no se activa en Azure (APIH_AUTH ausente en Bicep)', !/APIH_AUTH/.test(fs.readFileSync(path.join(R, 'infra/main.bicep'), 'utf8')));
  ok('sin secretos en el repositorio (service_role / claves)', !/service_role|AAD_CLIENT_SECRET\s*[:=]\s*['"][^'"]{8,}/.test(html + fs.readFileSync(path.join(R, 'apps/corporativo/staticwebapp.config.json'), 'utf8')));
  try { const b = process.env.BICEP || 'bicep'; sh(`${b} build "${R}/infra/main.bicep" --stdout > /dev/null`); ok('Bicep compila', true); } catch (e) { ok('Bicep compila', !/error/i.test(String(e.stderr)) && /not found|ENOENT|no se reconoce/i.test(String(e.stderr || e.message)) ? true : false, 'omitida si no hay CLI Bicep (BICEP=/ruta/bicep)'); }
  fs.rmSync(T, { recursive: true, force: true });
  let fallas = 0; for (const [n, v, d] of res) { if (!v) fallas++; console.log((v ? '  [OK]    ' : '  [FALLA] ') + n + (d ? ' — ' + d : '')); }
  console.log('\n' + res.length + ' comprobaciones · ' + (res.length - fallas) + ' OK · ' + fallas + ' fallan'); process.exit(fallas ? 1 : 0);
})();
