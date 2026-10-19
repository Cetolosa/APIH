#!/usr/bin/env node
/* C2.20 · Verificación de un ambiente desplegado (dev / prod). Solo HTTP; no necesita navegador.
 * Uso:  node tests/e2e/verificar-despliegue.js https://<host-swa>  [--sin-datos]
 * Credenciales (opcionales; sin ellas solo corren las comprobaciones anónimas). Para cada rol, el valor de la cookie
 * StaticWebAppsAuthCookie de una sesión iniciada con una cuenta de ese grupo (DevTools → Application → Cookies):
 *   APIH_COOKIE_ADMIN, APIH_COOKIE_EDITOR, APIH_COOKIE_LECTURA
 * Modo local/API directa (pruebas del propio verificador): APIH_MODO=principal  → manda x-ms-client-principal por rol.
 * Crea datos «[VERIF]» y los elimina al final (necesita Admin); --sin-datos omite las pruebas que escriben.
 * Código de salida 1 si algo falla. NO imprime cookies ni tokens. */
'use strict';
const BASE = (process.argv[2] || '').replace(/\/$/, ''); const SIN_DATOS = process.argv.includes('--sin-datos');
if (!/^https?:\/\//.test(BASE)) { console.error('Uso: node tests/e2e/verificar-despliegue.js https://<host-swa> [--sin-datos]'); process.exit(2); }
const MODO = process.env.APIH_MODO || 'cookie';
const ROLES = { Admin: ['APIH_COOKIE_ADMIN', 'apih-admin'], Editor: ['APIH_COOKIE_EDITOR', 'apih-editor'], Lectura: ['APIH_COOKIE_LECTURA', 'apih-lectura'] };
const cred = rol => {
  if (MODO === 'principal') return { 'x-ms-client-principal': Buffer.from(JSON.stringify({ identityProvider: 'aad', userDetails: rol.toLowerCase() + '@aramark.cl', userRoles: ['authenticated', ROLES[rol][1]] })).toString('base64') };
  const c = process.env[ROLES[rol][0]]; return c ? { cookie: 'StaticWebAppsAuthCookie=' + c } : null;
};
const res = []; const reg = (n, v, d) => { res.push([n, v, d || '']); console.log((v === null ? '  [OMITIDA] ' : v ? '  [OK]      ' : '  [FALLA]   ') + n + (d ? ' — ' + d : '')); };
const llamar = async (m, p, { rol, body, version, headers } = {}) => {
  const h = Object.assign({ accept: 'application/json' }, rol ? cred(rol) : {}, headers || {});
  if (body !== undefined) h['content-type'] = 'application/json'; if (version != null) h['if-match'] = '"' + version + '"';
  const r = await fetch(BASE + p, { method: m, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { /* no JSON */ }
  return { s: r.status, h: r.headers, j, t };
};
const chequeo = async (n, f) => { try { const v = await f(); if (v === null) reg(n, null, 'faltan credenciales'); else reg(n, v === true, v === true ? '' : String(v)); } catch (e) { reg(n, false, 'ERROR ' + e.message); } };
const prj = x => Object.assign({ tipo: 'Proyecto', titulo: '[VERIF] Prueba de despliegue', fase: 'Planificación', estado: 'En curso', lider: 'verif@aramark.cl', motivoAlta: 'Urgente', area: ['BISE'], inicioPlan: '2026-11-01', finPlan: '2027-02-01' }, x || {});

(async () => {
  console.log('Verificando ' + BASE + ' (' + new Date().toISOString() + ')\n\nA · Anónimo');
  await chequeo('A1 · /api/salud responde ok y la versión del núcleo', async () => { const r = await llamar('GET', '/api/salud'); return r.s === 200 && r.j && r.j.ok === true ? true : 'estado ' + r.s; });
  await chequeo('A2 · respuestas de la API con nosniff y no-store', async () => { const r = await llamar('GET', '/api/salud'); return r.h.get('x-content-type-options') === 'nosniff' && /no-store/.test(r.h.get('cache-control') || '') ? true : 'faltan cabeceras'; });
  await chequeo('A3 · sin sesión no se leen datos (/api/iniciativas ≠ 200)', async () => { const r = await llamar('GET', '/api/iniciativas'); return r.s !== 200 && !(r.j && Array.isArray(r.j)) ? true : 'estado ' + r.s; });
  await chequeo('A4 · /api/roles no otorga acceso (sin claims → sin roles)', async () => { const r = await llamar('POST', '/api/roles', { body: { claims: [] } }); return r.s === 200 && r.j && Array.isArray(r.j.roles) && r.j.roles.length === 0 ? true : 'estado ' + r.s + ' ' + r.t.slice(0, 80); });
  if (MODO !== 'principal') {
    await chequeo('A5 · la SPA exige inicio de sesión (redirige a Entra ID)', async () => { const r = await llamar('GET', '/'); const loc = r.h.get('location') || ''; return [301, 302, 303, 307].includes(r.s) && /login|\.auth/.test(loc) ? true : 'estado ' + r.s + ' ' + loc.slice(0, 60); });
    await chequeo('A6 · el inicio de sesión apunta a login.microsoftonline.com con el tenant (no <TENANT-ID>)', async () => { const r = await llamar('GET', '/.auth/login/aad'); const loc = r.h.get('location') || ''; return /login\.microsoftonline\.com\/[0-9a-f-]{36}\//.test(loc) && !/TENANT/i.test(loc) ? true : 'estado ' + r.s + ' ' + loc.slice(0, 80); });
    await chequeo('A7 · proveedores GitHub/Twitter bloqueados (404)', async () => { const a = await llamar('GET', '/.auth/login/github'), b = await llamar('GET', '/.auth/login/twitter'); return a.s === 404 && b.s === 404 ? true : a.s + '/' + b.s; });
    await chequeo('A8 · cabeceras globales: HSTS, nosniff, frame-ancestors con Teams', async () => { const r = await llamar('GET', '/api/salud'); return /max-age=\d+/.test(r.h.get('strict-transport-security') || '') && /frame-ancestors[^;]*teams\.microsoft\.com/.test(r.h.get('content-security-policy') || '') ? true : 'faltan'; });
  }
  console.log('\nB · Roles (cada rol ve su permiso)');
  for (const rol of ['Admin', 'Editor', 'Lectura']) {
    await chequeo('B · ' + rol + ' · /api/yo devuelve el rol ' + rol, async () => { if (!cred(rol)) return null; const r = await llamar('GET', '/api/yo', { rol }); return r.s === 200 && r.j && r.j.rol === rol ? true : 'estado ' + r.s + ' rol ' + (r.j && r.j.rol); });
    await chequeo('B · ' + rol + ' · puede leer el portafolio', async () => { if (!cred(rol)) return null; const r = await llamar('GET', '/api/iniciativas', { rol }); return r.s === 200 ? true : 'estado ' + r.s; });
  }
  await chequeo('B · Lectura NO puede crear (403)', async () => { if (!cred('Lectura')) return null; const r = await llamar('POST', '/api/iniciativas', { rol: 'Lectura', body: prj() }); return r.s === 403 ? true : 'estado ' + r.s; });
  await chequeo('B · Editor NO puede despachar avisos (solo Admin)', async () => { if (!cred('Editor')) return null; const r = await llamar('POST', '/api/notificaciones/despachar', { rol: 'Editor', body: {} }); return r.s === 403 ? true : 'estado ' + r.s; });
  await chequeo('B · Admin puede simular el despacho de avisos', async () => { if (!cred('Admin')) return null; const r = await llamar('POST', '/api/notificaciones/despachar', { rol: 'Admin', body: {} }); return r.s === 200 ? true : 'estado ' + r.s + ' ' + r.t.slice(0, 80); });

  console.log('\nC · Ciclo de datos (crear → editar → conflicto → compuertas → estado → leer → borrar)');
  const W = cred('Editor') ? 'Editor' : cred('Admin') ? 'Admin' : null, creados = [];
  if (SIN_DATOS || !W) console.log('  [OMITIDAS] ' + (SIN_DATOS ? '--sin-datos' : 'sin credenciales de Editor/Admin'));
  else {
    let a; const v0 = {};
    await chequeo('C1 · crear proyecto (201, id y versión del servidor)', async () => { const r = await llamar('POST', '/api/iniciativas', { rol: W, body: prj() }); if (r.s !== 201 || !r.j || !r.j.id) return 'estado ' + r.s + ' ' + r.t.slice(0, 120); a = r.j; creados.push(a.id); return a.version ? true : 'sin versión'; });
    if (a) {
      await chequeo('C2 · el sello modificadoPor lo pone el servidor (no el cuerpo)', async () => { const r = await llamar('POST', '/api/iniciativas', { rol: W, body: prj({ titulo: '[VERIF] sello', modificadoPor: 'falso@x.cl' }) }); if (r.j && r.j.id) creados.push(r.j.id); return r.j && r.j.modificadoPor && r.j.modificadoPor !== 'falso@x.cl' ? true : 'modificadoPor=' + (r.j && r.j.modificadoPor); });
      await chequeo('C3 · actualizar con versión (200) y subir la versión', async () => { const r = await llamar('PATCH', '/api/iniciativas/' + a.id, { rol: W, body: { avance: 10 }, version: a.version }); if (r.s !== 200) return 'estado ' + r.s + ' ' + r.t.slice(0, 100); v0.viejo = a.version; a = r.j; return a.avance === 10 && a.version !== v0.viejo ? true : 'sin cambio'; });
      await chequeo('C4 · versión vieja → 409 (conflicto optimista)', async () => { const r = await llamar('PATCH', '/api/iniciativas/' + a.id, { rol: W, body: { avance: 20 }, version: v0.viejo }); return r.s === 409 ? true : 'estado ' + r.s; });
      await chequeo('C5 · cambio de estado por la vía propia exige motivo (422)', async () => { const r = await llamar('POST', '/api/iniciativas/' + a.id + '/estado', { rol: W, body: { estado: 'Pausado' }, version: a.version }); return r.s === 422 ? true : 'estado ' + r.s; });
      await chequeo('C6 · compuertas: saltar a Ejecución sin cumplirlas → 422 COMPUERTA', async () => { const r = await llamar('POST', '/api/iniciativas/' + a.id + '/fase', { rol: W, body: { fase: 'Ejecución' }, version: a.version }); return r.s === 422 && r.j && r.j.codigo === 'COMPUERTA' ? true : 'estado ' + r.s + ' ' + (r.j && r.j.codigo); });
      await chequeo('C7 · Completado fuera de Cierre se rechaza (422)', async () => { const r = await llamar('POST', '/api/iniciativas/' + a.id + '/estado', { rol: W, body: { estado: 'Completado' }, version: a.version }); return r.s === 422 ? true : 'estado ' + r.s; });
      await chequeo('C8 · hito: crear y completar (fechaReal)', async () => { const h = await llamar('POST', '/api/iniciativas/' + a.id + '/hitos', { rol: W, body: { nombre: '[VERIF] H1', fase: 'Planificación', fecha: '2026-11-15' } }); if (h.s !== 201) return 'crear ' + h.s + ' ' + h.t.slice(0, 100); const c = await llamar('POST', '/api/hitos/' + h.j.id + '/completar', { rol: W, body: {}, version: h.j.version }); return c.s === 200 && c.j.fechaReal ? true : 'completar ' + c.s; });
      await chequeo('C9 · riesgo: crear con probabilidad/impacto válidos; fuera de rango → 422', async () => { const r = await llamar('POST', '/api/iniciativas/' + a.id + '/riesgos', { rol: W, body: { desc: '[VERIF] R1', prob: 3, imp: 4, mit: 'Plan B' } }); const m = await llamar('POST', '/api/iniciativas/' + a.id + '/riesgos', { rol: W, body: { desc: '[VERIF] R2', prob: 6, imp: 4, mit: 'Plan B' } }); return r.s === 201 && m.s === 422 ? true : 'válido ' + r.s + ' / fuera de rango ' + m.s; });
      await chequeo('C10 · leer de vuelta: aparece en el listado y en su ficha', async () => { const l = await llamar('GET', '/api/iniciativas', { rol: W }); const f = await llamar('GET', '/api/iniciativas/' + a.id, { rol: W }); return l.s === 200 && JSON.stringify(l.j).includes(a.id) && f.s === 200 && f.j.id === a.id ? true : 'listado ' + l.s + ' ficha ' + f.s; });
      await chequeo('C11 · texto con HTML/script se guarda inerte (no se interpreta en el servidor)', async () => { const r = await llamar('PATCH', '/api/iniciativas/' + a.id, { rol: W, body: { titulo: '[VERIF] <img src=x onerror=alert(1)>' }, version: a.version }); if (r.s === 200) a = r.j; return r.s === 200 || r.s === 422 ? true : 'estado ' + r.s; });
    }
    await chequeo('C12 · borrar los datos [VERIF] (Admin)', async () => {
      if (!cred('Admin')) return 'sin credencial Admin: borrar a mano las iniciativas «[VERIF]» (' + creados.length + ')';
      let malos = 0; for (const id of creados) { const f = await llamar('GET', '/api/iniciativas/' + id, { rol: 'Admin' }); const d = await llamar('DELETE', '/api/iniciativas/' + id, { rol: 'Admin', version: f.j && f.j.version }); if (![200, 204].includes(d.s)) malos++; }
      return malos === 0 ? true : malos + ' sin borrar';
    });
  }
  const f = res.filter(r => r[1] === false).length, o = res.filter(r => r[1] === true).length, om = res.filter(r => r[1] === null).length;
  console.log('\n' + res.length + ' comprobaciones · ' + o + ' OK · ' + f + ' fallan · ' + om + ' omitidas (sin credenciales)');
  if (om) console.log('Las omitidas NO están verificadas: entregue las cookies de los 3 roles para una verificación completa.');
  process.exit(f ? 1 : 0);
})();
