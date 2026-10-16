/* C2.8 — Notificaciones en servidor: lectura de la base con forma de SPA, avisos por persona, envío una sola vez,
 * simulación, adaptadores de correo (Graph) y Teams (webhook), y rutas HTTP con permisos. Sin dependencias ni red. */
'use strict';
const assert = require('assert'), path = require('path');
const api = p => require(path.join(__dirname, '..', '..', 'services', 'api', 'src', p));
const crearServicio = api('servicio'), crearApp = api('app'), storeMem = api('store-memoria'), N = api('notificaciones');
let n = 0; const caso = async (d, f) => { await f(); n++; console.log('  ✓ ' + d); };
const H = '2026-10-16';

async function base() {
  const s = storeMem();
  const reg = (l, id, v) => s.insertar('reg:' + l, { id, datos: JSON.stringify(v) });
  await s.insertar('iniciativas', { id: 'PRJ-050', tipo: 'Proyecto', titulo: 'APIH Corporativo', lider: 'Ana Pérez', sponsor: 'Carla Soto', area: ['BISE'], fase: 'Ejecución', estado: 'En curso', inicioPlan: '2026-08-01', finPlan: '2026-10-30', avance: 40, actualizada: '2026-10-15', creada: '2026-08-01', version: 'x' });
  await s.insertar('hitos', { id: 'HIT-001', ini: 'PRJ-050', nombre: 'Ambiente dev', fase: 'Ejecución', fecha: '2026-10-12', completado: false, resp: 'Ana Pérez' });
  await s.insertar('riesgos', { id: 'RSK-001', ini: 'PRJ-050', desc: 'Habilitación Azure tardía', prob: 5, imp: 4, estado: 'Abierto', dueno: 'Beto Ruiz' });
  await reg('APIH_Compromisos', 'CMP-001', { id: 'CMP-001', ini: 'PRJ-050', texto: 'Enviar propuesta', resp: 'Ana Pérez', limite: '2026-10-17', estado: 'Abierto' });
  await reg('APIH_Bitacora', 'BIT-001', { id: 'BIT-001', ini: 'PRJ-050', tipo: 'Comentario', texto: 'Revisemos', autor: 'Beto Ruiz', ts: '2026-10-15T09:00:00' });
  await reg('APIH_Roles', 'usuarios', [{ n: 'Ana Pérez', rol: 'Colaborador', area: 'BISE', correo: 'ana@ejemplo.cl' }, { n: 'Beto Ruiz', rol: 'Colaborador', area: 'BISE', correo: '' }, { n: 'Carla Soto', rol: 'Gasto', area: 'BISE', correo: 'carla@ejemplo.cl', veTodo: true }]);
  const cfg = JSON.stringify({ umbralCritico: 15, tolDesv: 10, diasSinUpdate: 14, notif: { canalOn: { correo: true, teams: true }, tipos: { hito_venc: { canales: { correo: true, teams: true } }, riesgo_crit: { canales: { correo: true } }, comp_prox: { canales: { correo: true } } } } });
  /* valor grande en trozos, como lo guarda la SPA */
  await s.insertar('reg:APIH_Config', { id: 'cfg', datos: JSON.stringify({ __chunks: 2 }) });
  await s.insertar('reg:APIH_Config', { id: 'cfg#1', datos: cfg.slice(0, 40) }); await s.insertar('reg:APIH_Config', { id: 'cfg#2', datos: cfg.slice(40) });
  return s;
}

(async () => {
  await caso('lee la base con la forma de la SPA (área como texto, ajustes en trozos, usuarios de APIH_Roles)', async () => {
    const d = await N.cargarDatos(await base());
    assert.strictEqual(d.ini[0].area, 'BISE'); assert.ok(!('version' in d.ini[0])); assert.strictEqual(d.cfg.umbralCritico, 15);
    assert.strictEqual(d.usuarios.length, 3); assert.strictEqual(d.bitacora.length, 1); assert.strictEqual(d.compromisos.length, 1);
  });
  await caso('avisos por persona: Ana (hito vencido, compromiso próximo, comentario, riesgo crítico como líder) y canales por preferencia', async () => {
    const d = await N.cargarDatos(await base()), a = N.avisosDe(d, 'Ana Pérez', H), t = a.map(x => x.tipo).sort();
    assert.deepStrictEqual(t, ['comp_prox', 'ev_comentario', 'hito_venc', 'riesgo_crit']);   /* riesgo: Ana es líder */
    assert.deepStrictEqual(a.find(x => x.tipo === 'hito_venc').canales, ['app', 'correo', 'teams']);
    assert.strictEqual(N.personaDe(d, { email: 'ANA@ejemplo.cl', nombre: 'otro' }), 'Ana Pérez');
  });
  await caso('envía una sola vez por persona y canal; la segunda corrida no repite', async () => {
    const s = await base(), env = []; const canales = { correo: async (d, a) => env.push(['correo', d.correo, a.length]), teams: async (d, a) => env.push(['teams', d.correo, a.length]) };
    const r1 = await N.despachar({ store: s, hoy: H, canales, ahora: () => 'T' });
    assert.ok(r1.envios.length >= 2 && !r1.errores.length, JSON.stringify(r1));
    assert.ok(env.some(e => e[0] === 'correo' && e[1] === 'ana@ejemplo.cl')); assert.ok(env.some(e => e[0] === 'teams' && e[1] === 'ana@ejemplo.cl'));
    assert.ok(r1.omitidosSinCorreo.includes('Beto Ruiz'));
    const k = env.length, r2 = await N.despachar({ store: s, hoy: H, canales });
    assert.strictEqual(env.length, k); assert.strictEqual(r2.envios.length, 0);
  });
  await caso('simulación: calcula sin enviar ni registrar; un error de canal no registra y no corta la corrida', async () => {
    const s = await base(); let llamado = 0;
    const r = await N.despachar({ store: s, hoy: H, canales: { correo: async () => { llamado++; } }, simular: true });
    assert.ok(r.envios.length && r.envios.every(e => e.simulado)); assert.strictEqual(llamado, 0); assert.strictEqual((await s.listar('reg:' + N.ENVIADAS)).length, 0);
    const r2 = await N.despachar({ store: s, hoy: H, canales: { correo: async () => { throw new Error('caído'); } } });
    assert.ok(r2.errores.length); assert.strictEqual((await s.listar('reg:' + N.ENVIADAS)).length, 0);
  });
  await caso('correo vía Graph: token de identidad administrada y sendMail al destinatario, sin secretos', async () => {
    const llamadas = [], f = async (url, o = {}) => { llamadas.push([url, o]); return url.startsWith('http://id') ? { ok: true, json: async () => ({ access_token: 'TK' }) } : { status: 202 }; };
    const c = api('canales/graph-correo')({ IDENTITY_ENDPOINT: 'http://id/msi', IDENTITY_HEADER: 'h', APIH_CORREO_REMITENTE: 'apih@aramark.cl', APIH_URL_APP: 'https://apih.example' }, f);
    await c({ nombre: 'Ana Pérez', correo: 'ana@ejemplo.cl' }, [{ tipo: 'hito_venc', titulo: 'Hito vencido', texto: '«Ambiente dev» <venció>', sev: 2 }]);
    assert.ok(llamadas[0][0].includes('resource=https%3A%2F%2Fgraph.microsoft.com')); assert.strictEqual(llamadas[0][1].headers['X-IDENTITY-HEADER'], 'h');
    assert.ok(llamadas[1][0].endsWith('/users/apih%40aramark.cl/sendMail')); assert.strictEqual(llamadas[1][1].headers.authorization, 'Bearer TK');
    const m = JSON.parse(llamadas[1][1].body).message; assert.strictEqual(m.toRecipients[0].emailAddress.address, 'ana@ejemplo.cl');
    assert.ok(m.body.content.includes('&lt;venció&gt;') && !m.body.content.includes('<venció>'), 'HTML escapado');
    assert.throws(() => api('canales/graph-correo')({}, f), /APIH_CORREO_REMITENTE/);
  });
  await caso('Teams vía webhook del flujo de TI: carga útil con destinatario y avisos; exige https', async () => {
    let cuerpo; const c = api('canales/teams-webhook')({ APIH_TEAMS_WEBHOOK: 'https://flujo.example/hook' }, async (u, o) => { cuerpo = JSON.parse(o.body); return { ok: true }; });
    await c({ nombre: 'Ana Pérez', correo: 'ana@ejemplo.cl' }, [{ tipo: 'riesgo_crit', titulo: 'Riesgo crítico abierto', texto: 'Exposición 20', sev: 3, ini: 'PRJ-050' }]);
    assert.strictEqual(cuerpo.para, 'ana@ejemplo.cl'); assert.strictEqual(cuerpo.avisos[0].ini, 'PRJ-050'); assert.ok(/1 aviso nuevo/.test(cuerpo.asunto));
    assert.throws(() => api('canales/teams-webhook')({ APIH_TEAMS_WEBHOOK: 'http://x' }), /https/);
  });
  await caso('HTTP: GET /api/notificaciones para el usuario; despachar solo Admin y por defecto simula', async () => {
    const s = await base(), servicio = crearServicio({ store: s, hoy: () => H }), env = { APIH_AUTH: 'dev', APIH_NOTIF_CANALES: 'correo' };
    const h = crearApp({ servicio, env }), req = (m, p, u, rol, q) => h({ method: m, path: p, query: q || {}, headers: { 'x-dev-user': u, 'x-dev-rol': rol } });
    const r = await req('GET', '/api/notificaciones', 'ana@ejemplo.cl', 'Lectura'); assert.strictEqual(r.status, 200); assert.strictEqual(JSON.parse(r.body).length, 4);
    assert.strictEqual((await req('POST', '/api/notificaciones/despachar', 'ana@ejemplo.cl', 'Editor')).status, 403);
    const d = await req('POST', '/api/notificaciones/despachar', 'carla@ejemplo.cl', 'Admin'); assert.strictEqual(d.status, 200);
    const b = JSON.parse(d.body); assert.ok(b.envios.length && b.envios.every(e => e.simulado)); assert.strictEqual((await s.listar('reg:' + N.ENVIADAS)).length, 0);
  });
  console.log('OK notificaciones — ' + n + ' casos');
})().catch(e => { console.error('FALLA notificaciones:', e.stack || e.message); process.exit(1); });
