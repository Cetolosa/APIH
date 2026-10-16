/* C2.0 — Seguridad y protocolo HTTP de la API (independiente del store). */
'use strict';
const assert = require('assert');
const crearServicio = require('../../services/api/src/servicio'), crearStore = require('../../services/api/src/store-memoria'), crearApp = require('../../services/api/src/app');
module.exports = async function (log = console.log) {
  let ok = 0; const caso = async (n, f) => { await f(); ok++; log('  ✓ ' + n); };
  const app = env => crearApp({ servicio: crearServicio({ store: crearStore(), hoy: () => '2026-10-16' }), env: env || {} });
  const P = (email, roles) => Buffer.from(JSON.stringify({ userDetails: email, userRoles: roles })).toString('base64');
  await caso('sin sesión → 401; /api/salud es pública', async () => {
    const h = app(); assert.strictEqual((await h({ method: 'GET', path: '/api/iniciativas' })).status, 401);
    const s = await h({ method: 'GET', path: '/api/salud' }); assert.strictEqual(s.status, 200); assert.ok(JSON.parse(s.body).core);
  });
  await caso('sesión sin rol de APIH → 403 (salvo /api/yo)', async () => {
    const h = app(), hd = { 'x-ms-client-principal': P('ana@aramark.cl', ['authenticated']) };
    assert.strictEqual((await h({ method: 'GET', path: '/api/iniciativas', headers: hd })).status, 403);
    const y = await h({ method: 'GET', path: '/api/yo', headers: hd }); assert.strictEqual(y.status, 200); assert.strictEqual(JSON.parse(y.body).rol, null);
  });
  await caso('dominio restringido (APIH_DOMINIO=aramark.cl)', async () => {
    const h = app({ APIH_DOMINIO: 'aramark.cl' });
    assert.strictEqual((await h({ method: 'GET', path: '/api/iniciativas', headers: { 'x-ms-client-principal': P('x@gmail.com', ['apih-admin']) } })).status, 401);
    assert.strictEqual((await h({ method: 'GET', path: '/api/iniciativas', headers: { 'x-ms-client-principal': P('ana@aramark.cl', ['apih-admin']) } })).status, 200);
  });
  await caso('encabezados de desarrollo ignorados fuera de APIH_AUTH=dev', async () => {
    assert.strictEqual((await app()({ method: 'GET', path: '/api/iniciativas', headers: { 'x-dev-user': 'yo', 'x-dev-rol': 'Admin' } })).status, 401);
    assert.strictEqual((await app({ APIH_AUTH: 'dev' })({ method: 'GET', path: '/api/iniciativas', headers: { 'x-dev-user': 'yo', 'x-dev-rol': 'Admin' } })).status, 200);
  });
  await caso('modificadoPor sale del token, no del cuerpo', async () => {
    const h = app(), hd = { 'x-ms-client-principal': P('Ana@Aramark.cl', ['apih-editor']) };
    const r = await h({ method: 'POST', path: '/api/iniciativas', headers: hd, body: { tipo: 'Propuesta', titulo: 'T', fase: 'Recepción', estado: 'Vigente', lider: 'Ana', modificadoPor: 'falso@x.com' } });
    assert.strictEqual(r.status, 201); assert.strictEqual(JSON.parse(r.body).modificadoPor, 'ana@aramark.cl'); assert.ok(r.headers.etag);
  });
  await caso('404 de ruta, 405 de método, sin If-Match → CONFLICTO (409)', async () => {
    const h = app(), hd = { 'x-ms-client-principal': P('ana@aramark.cl', ['apih-editor']) };
    assert.strictEqual((await h({ method: 'GET', path: '/api/nada', headers: hd })).status, 404);
    assert.strictEqual((await h({ method: 'PUT', path: '/api/iniciativas', headers: hd })).status, 405);
    const c = JSON.parse((await h({ method: 'POST', path: '/api/iniciativas', headers: hd, body: { tipo: 'Propuesta', titulo: 'T', fase: 'Recepción', estado: 'Vigente', lider: 'Ana' } })).body);
    assert.strictEqual((await h({ method: 'PATCH', path: '/api/iniciativas/' + c.id, headers: hd, body: { titulo: 'X' } })).status, 409);
  });
  await caso('transacción: si aprobar falla a mitad, no queda nada a medias', async () => {
    const store = crearStore(), s = crearServicio({ store, hoy: () => '2026-10-16' }), u = { email: 'a@aramark.cl', rol: 'Editor' };
    let p = await s.crear(u, { tipo: 'Propuesta', titulo: 'P', fase: 'Recepción', estado: 'Vigente', lider: 'Ana' });
    const orig = store.actualizar; let n = 0; store.actualizar = async (...a) => { if (++n === 1 && a[0] === 'iniciativas' && a[1].estado === 'Aprobada') throw new Error('falla simulada'); return orig(...a); };
    const ant = (await store.listar('iniciativas')).length;
    await assert.rejects(store.tx(async t => { await t.insertar('iniciativas', { tipo: 'Proyecto' }, 'PRJ'); await t.actualizar('iniciativas', Object.assign({}, p, { estado: 'Aprobada' }), p.version); }));
    store.actualizar = orig; assert.strictEqual((await store.listar('iniciativas')).length, ant, 'rollback');
  });
  return ok;
};
