/* C2.1 — La migración produce datos que la API acepta: respaldo simulado (plan real) → script → store SQL simulado → API. */
'use strict';
const assert = require('assert'), path = require('path');
const migrar = require('../../tools/migrar-desde-prototipo.js');
const plan = require('../../docs/APIH_iniciativas_con_plan.json');
const St = { cfg: { umbralCritico: 15 }, ini: [], hitos: [], riesgos: [] }; let h = 0, r = 0;
plan.iniciativas.forEach((x, k) => { const id = 'PRJ-00' + (k + 1); St.ini.push(Object.assign({ id, legacy: '', est: [], rec: null, origen: 'importación', creada: '2026-10-15', hist: [['2026-10-15', x.avance]] }, x, { hitos: undefined, riesgos: undefined }));
  (x.hitos || []).forEach(y => St.hitos.push(Object.assign({ id: 'HIT-' + String(++h).padStart(3, '0'), ini: id }, y)));
  (x.riesgos || []).forEach(y => St.riesgos.push(Object.assign({ id: 'RSK-' + String(++r).padStart(3, '0'), ini: id, estado: 'Abierto' }, y))); });
St.ini.push({ id: 'PRJ-099', tipo: 'Proyecto', titulo: '', fase: 'Planificación', estado: 'En curso', lider: 'X', area: 'BISE' });   // inválido a propósito
const { sql, rep, filas } = migrar(St, 'migracion@aramark.cl');
assert.strictEqual(rep.ok.ini, 2); assert.strictEqual(rep.ok.hit, St.hitos.length); assert.strictEqual(rep.ok.rsk, St.riesgos.length);
assert.strictEqual(rep.errores.length, 1); assert.match(rep.errores[0], /PRJ-099.*titulo/);
assert.ok(filas.iniciativas.every(([, x]) => Array.isArray(x.area)), 'area como lista');
assert.ok(!/"(est|rec|legacy)"/.test(sql), 'sin campos internos de la interfaz');
assert.match(sql, /ALTER SEQUENCE apih\.seq_HIT RESTART WITH \d+;/); assert.match(sql, /^BEGIN TRANSACTION;$/m);
assert.strictEqual((sql.match(/^INSERT INTO /mg) || []).length, rep.ok.ini + rep.ok.hit + rep.ok.rsk);
// Cargar los mismos datos en el store SQL simulado y leerlos por la API
(async () => {
  const sim = require('../contract/sql-simulado')(), { crearStoreSql } = require('../../services/api/src/store-mssql');
  for (const [t, L] of Object.entries(filas)) for (const [id, x] of L) { const b = Buffer.alloc(8); b.writeUInt32BE(1, 4); (sim.T['apih.' + t] = sim.T['apih.' + t] || new Map()).set(id, { id, doc: JSON.stringify(x), ver: b }); }
  const s = require('../../services/api/src/servicio')({ store: crearStoreSql(sim), hoy: () => '2026-10-16' }), u = { email: 'a@aramark.cl', rol: 'Lectura' };
  const L = await s.listar(u); assert.strictEqual(L.length, 2);
  const corp = L.find(x => x.titulo === 'APIH Corporativo'); assert.strictEqual((await s.listarHitos(u, corp.id)).length, 21);
  const F = await s.fases(u, corp.id); assert.strictEqual(F.length, 4);
  console.log('OK migración: ' + rep.ok.ini + ' iniciativas, ' + rep.ok.hit + ' hitos, ' + rep.ok.rsk + ' riesgos; 1 inválido informado; datos legibles por la API');
})().catch(e => { console.error('✗', e.message); process.exit(1); });
