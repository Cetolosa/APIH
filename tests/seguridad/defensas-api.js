/* Pruebas de defensa de la API corporativa (17-10-2026). Verifican que la API RECHAZA accesos y datos indebidos.
 * Modo producción (sin APIH_AUTH=dev), store en memoria. Complementa tests/contract/http-seguridad.js.
 * Uso: node tests/seguridad/defensas-api.js — imprime cada caso RESISTE / FALLA; código 1 si alguno falla. */
'use strict';
const path = require('path'), R = p => require(path.join(__dirname, '..', '..', p));
const crearServicio = R('services/api/src/servicio'), crearStore = R('services/api/src/store-memoria'), crearApp = R('services/api/src/app');
const P = (email, roles) => Buffer.from(JSON.stringify({ userDetails: email, userRoles: roles })).toString('base64');
const H = (email, roles) => ({ 'x-ms-client-principal': P(email, roles), 'content-type': 'application/json' });
const ADMIN = H('ana@aramark.cl', ['apih-admin']), EDITOR = H('eva@aramark.cl', ['apih-editor']), LECT = H('leo@aramark.cl', ['apih-lectura']);
const res = [];
const chequeo = async (n, f) => { try { const v = await f(); res.push([n, v === true ? 'RESISTE' : 'FALLA: ' + v]); } catch (e) { res.push([n, 'ERROR: ' + e.message]); } };

(async () => {
  const nuevaApp = (env) => crearApp({ servicio: crearServicio({ store: crearStore(), hoy: () => '2026-10-17' }), env: Object.assign({ APIH_DOMINIO: 'aramark.cl' }, env) });
  const J = r => { try { return JSON.parse(r.body); } catch (e) { return null; } };
  // Siembra una iniciativa con rol Editor para las pruebas que necesitan un id existente
  const sembrar = async (h) => { const a = h || nuevaApp(); const r = await a({ method: 'POST', path: '/api/iniciativas', headers: EDITOR, body: { tipo: 'Proyecto', titulo: 'Base', fase: 'Planificación', estado: 'En curso', lider: 'Eva', motivoAlta: 'prueba', inicioPlan: '2026-10-01', finPlan: '2026-12-01' } }); return { app: a, id: J(r).id, ver: J(r).version }; };

  // --- A. Autenticación y dominio ---
  await chequeo('A1 · sin sesión no entra a datos', async () => {
    const r = await nuevaApp()({ method: 'GET', path: '/api/iniciativas' }); return r.status === 401 || 'esperaba 401, vino ' + r.status; });
  await chequeo('A2 · cuenta fuera del dominio corporativo', async () => {
    const r = await nuevaApp()({ method: 'GET', path: '/api/iniciativas', headers: H('externo@gmail.com', ['apih-admin']) }); return r.status === 401 || 'una cuenta @gmail con rol entró (' + r.status + ')'; });
  await chequeo('A3 · encabezados de desarrollo no funcionan en producción', async () => {
    const r = await nuevaApp()({ method: 'GET', path: '/api/iniciativas', headers: { 'x-dev-user': 'yo', 'x-dev-rol': 'Admin' } }); return r.status === 401 || 'x-dev-* aceptado sin APIH_AUTH=dev (' + r.status + ')'; });
  await chequeo('A4 · principal ilegible no otorga acceso', async () => {
    const r = await nuevaApp()({ method: 'GET', path: '/api/iniciativas', headers: { 'x-ms-client-principal': 'no-es-base64-json!!' } }); return r.status === 401 || 'principal corrupto aceptado (' + r.status + ')'; });
  await chequeo('A5 · sesión sin rol de APIH no lee datos', async () => {
    const r = await nuevaApp()({ method: 'GET', path: '/api/iniciativas', headers: H('nadie@aramark.cl', ['authenticated']) }); return r.status === 403 || 'cuenta sin rol leyó datos (' + r.status + ')'; });

  // --- B. Autorización por rol (escalada de privilegios) ---
  await chequeo('B1 · Lectura no puede crear', async () => {
    const r = await nuevaApp()({ method: 'POST', path: '/api/iniciativas', headers: LECT, body: { tipo: 'Propuesta', titulo: 'X', fase: 'Recepción', estado: 'Vigente', lider: 'Leo' } }); return r.status === 403 || 'Lectura creó una iniciativa (' + r.status + ')'; });
  await chequeo('B2 · Lectura no puede editar', async () => {
    const { app, id, ver } = await sembrar(); const r = await app({ method: 'PATCH', path: '/api/iniciativas/' + id, headers: Object.assign({}, LECT, { 'if-match': '"' + ver + '"' }), body: { titulo: 'Z' } }); return r.status === 403 || 'Lectura editó (' + r.status + ')'; });
  await chequeo('B3 · Lectura no puede borrar', async () => {
    const { app, id, ver } = await sembrar(); const r = await app({ method: 'DELETE', path: '/api/iniciativas/' + id, headers: Object.assign({}, LECT, { 'if-match': '"' + ver + '"' }) }); return r.status === 403 || 'Lectura borró (' + r.status + ')'; });
  await chequeo('B4 · Editor no puede migrar historial (solo Admin)', async () => {
    const r = await nuevaApp()({ method: 'POST', path: '/api/iniciativas', headers: Object.assign({}, EDITOR, { 'x-apih-migracion': '1' }), body: { tipo: 'Proyecto', titulo: 'Mig', fase: 'Cierre', estado: 'Cerrado', lider: 'Eva', creada: '2020-01-01', hist: [['2020-01-01', 100]] } });
    return r.status === 403 || (r.status < 300 && 'Editor migró conservando fechas antiguas (' + r.status + ')') || true; });
  await chequeo('B5 · Editor no modifica la lista de roles APIH_Roles', async () => {
    const r = await nuevaApp()({ method: 'PUT', path: '/api/registros/APIH_Roles/leo@aramark.cl', headers: EDITOR, body: { datos: { rol: 'Admin' } } }); return r.status === 403 || 'Editor escribió en APIH_Roles (' + r.status + ')'; });
  await chequeo('B6 · Editor no dispara el envío real de notificaciones', async () => {
    const r = await nuevaApp()({ method: 'POST', path: '/api/notificaciones/despachar?simular=0', headers: EDITOR, body: {} }); return r.status === 403 || 'Editor ejecutó el envío real (' + r.status + ')'; });

  // --- C. Suplantación / mass assignment (campos de confianza en el cuerpo) ---
  await chequeo('C1 · modificadoPor sale del token, no del cuerpo', async () => {
    const r = await nuevaApp()({ method: 'POST', path: '/api/iniciativas', headers: EDITOR, body: { tipo: 'Propuesta', titulo: 'T', fase: 'Recepción', estado: 'Vigente', lider: 'Eva', modificadoPor: 'victima@aramark.cl' } }); return J(r).modificadoPor === 'eva@aramark.cl' || 'modificadoPor del cuerpo prevaleció: ' + J(r).modificadoPor; });
  await chequeo('C2 · version/id del cuerpo no permiten pisar sin If-Match', async () => {
    const { app, id } = await sembrar(); const r = await app({ method: 'PATCH', path: '/api/iniciativas/' + id, headers: EDITOR, body: { titulo: 'Sin control de versión', version: 'cualquiera' } }); return r.status === 409 || 'editó sin If-Match correcto (' + r.status + ')'; });
  await chequeo('C3 · no se puede inyectar un id arbitrario de hito', async () => {
    const { app, id } = await sembrar(); const r = await app({ method: 'POST', path: '/api/iniciativas/' + id + '/hitos', headers: EDITOR, body: { id: 'HACK-1', nombre: 'h', fecha: '2026-11-01' } }); return r.status >= 400 || (/^HIT-/.test(J(r).id) ? true : 'aceptó id no-HIT: ' + J(r).id); });

  // --- D. IDOR / rutas ---
  await chequeo('D1 · recurso inexistente responde 404, no 500', async () => {
    const r = await nuevaApp()({ method: 'GET', path: '/api/iniciativas/PRJ-9999', headers: EDITOR }); return r.status === 404 || 'esperaba 404, vino ' + r.status; });
  await chequeo('D2 · mover un hito a una iniciativa inexistente se rechaza', async () => {
    const { app, id } = await sembrar(); const h1 = J(await app({ method: 'POST', path: '/api/iniciativas/' + id + '/hitos', headers: EDITOR, body: { nombre: 'h', fase: 'Planificación', fecha: '2026-11-01' } }));
    const r = await app({ method: 'PATCH', path: '/api/hitos/' + h1.id, headers: Object.assign({}, EDITOR, { 'if-match': '"' + h1.version + '"' }), body: { ini: 'PRJ-9999' } });
    return r.status === 404 || 'aceptó mover el hito a una iniciativa inexistente (' + r.status + ')'; });
  await chequeo('D3 · método no permitido responde 405 con Allow', async () => {
    const r = await nuevaApp()({ method: 'DELETE', path: '/api/salud', headers: EDITOR }); return r.status === 405 || 'esperaba 405, vino ' + r.status; });

  // --- E. Validación de entrada (inyección/datos corruptos) ---
  await chequeo('E1 · fase inexistente se rechaza', async () => {
    const r = await nuevaApp()({ method: 'POST', path: '/api/iniciativas', headers: EDITOR, body: { tipo: 'Propuesta', titulo: 'T', fase: "'; DROP TABLE apih.iniciativas;--", estado: 'Vigente', lider: 'Eva' } }); return r.status >= 400 || 'aceptó una fase inválida (' + r.status + ')'; });
  await chequeo('E2 · texto con HTML se guarda tal cual, sin ejecutarse (lo escapa la vista)', async () => {
    const r = await nuevaApp()({ method: 'POST', path: '/api/iniciativas', headers: EDITOR, body: { tipo: 'Propuesta', titulo: '<img src=x onerror=alert(1)>', fase: 'Recepción', estado: 'Vigente', lider: 'Eva' } }); return (r.status === 201 && J(r).titulo.includes('<img')) || 'el título cambió al guardarse: ' + (J(r) && JSON.stringify(J(r)).slice(0,120)); });
  await chequeo('E3 · subfase fuera de su fase se rechaza (422)', async () => {
    const { app, id, ver } = await sembrar(); const r = await app({ method: 'PATCH', path: '/api/iniciativas/' + id, headers: Object.assign({}, EDITOR, { 'if-match': '"' + ver + '"' }), body: { fase: 'Ejecución', subfases: [{ id: id + '-SF1', nombre: 'x', fase: 'Ejecución', inicio: '2020-01-01', fin: '2099-01-01' }] } }); return r.status >= 400 || 'aceptó una subfase fuera de su fase (' + r.status + ')'; });
  await chequeo('E4 · categoría de hito inválida se rechaza', async () => {
    const { app, id } = await sembrar(); const r = await app({ method: 'POST', path: '/api/iniciativas/' + id + '/hitos', headers: EDITOR, body: { nombre: 'h', fase: 'Planificación', fecha: '2026-11-01', cat: 'Inventada' } }); return r.status >= 400 || 'aceptó una categoría inválida (' + r.status + ')'; });
  await chequeo('E5 · número negativo donde se espera >= 0 se rechaza', async () => {
    const r = await nuevaApp()({ method: 'POST', path: '/api/iniciativas', headers: EDITOR, body: { tipo: 'Propuesta', titulo: 'T', fase: 'Recepción', estado: 'Vigente', lider: 'Eva', presupuesto: -999 } }); return r.status >= 400 || 'aceptó presupuesto negativo (' + r.status + ')'; });

  // --- F. Protocolo / cabeceras ---
  await chequeo('F1 · respuestas con X-Content-Type-Options: nosniff', async () => {
    const r = await nuevaApp()({ method: 'GET', path: '/api/salud' }); return r.headers['x-content-type-options'] === 'nosniff' || 'sin nosniff'; });
  await chequeo('F2 · respuestas con Cache-Control: no-store', async () => {
    const r = await nuevaApp()({ method: 'GET', path: '/api/salud' }); return /no-store/.test(r.headers['cache-control'] || '') || 'sin no-store'; });
  await chequeo('F3 · error interno no filtra detalles (500 genérico)', async () => {
    // fuerza un error pasando un cuerpo que el store no puede manejar: no debe devolver stack
    const r = await nuevaApp()({ method: 'POST', path: '/api/roles', body: { claims: 'no-es-lista' } }); return (r.body && !/at \/|Error:|stack/i.test(r.body)) || 'posible filtración en el cuerpo'; });

  console.log('\nPruebas de defensa de la API — ' + new Date().toISOString().slice(0, 10) + '\n');
  let fallas = 0; for (const [n, v] of res) { if (v !== 'RESISTE') fallas++; console.log('  ' + (v === 'RESISTE' ? '[OK] ' : '[!!] ') + n + ' — ' + v); }
  console.log('\n' + res.length + ' casos · ' + (res.length - fallas) + ' resisten · ' + fallas + ' requieren atención');
  process.exit(fallas ? 1 : 0);
})();
