/* C1.1 — Ejecuta esquema + contrato. Uso: node tests/contract/run.js */
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const core = require('../../packages/core/apih-core.js');
const raiz = path.join(__dirname, '..', '..');
const schema = JSON.parse(fs.readFileSync(path.join(raiz, 'packages/core/contracts/iniciativa.schema.json'), 'utf8'));

let plan0;
(async () => {
  // 1) El esquema y el core no se desalinean (mismas listas de valores)
  const I = core.INICIATIVA, P = schema.properties;
  assert.deepStrictEqual(P.fase.enum, [...I.FASES.Propuesta, ...I.FASES.Proyecto]);
  assert.deepStrictEqual(P.estado.enum, [...I.ESTADOS.Propuesta, ...I.ESTADOS.Proyecto]);
  assert.deepStrictEqual(P.rag.enum, I.RAGS); assert.deepStrictEqual(P.prioridad.enum, I.PRIOS); assert.deepStrictEqual(P.moneda.enum, I.MONEDAS);
  for (const T of ['Propuesta', 'Proyecto']) { const r = schema.allOf.find(x => x.if.properties.tipo.const === T).then.properties; assert.deepStrictEqual(r.fase.enum, I.FASES[T]); assert.deepStrictEqual(r.estado.enum, I.ESTADOS[T]); }
  assert.match(schema.$id, /\/C\d+\.\d+$/, 'el esquema declara su versión C');
  const sh = JSON.parse(fs.readFileSync(path.join(raiz, 'packages/core/contracts/hito.schema.json'), 'utf8')), sr = JSON.parse(fs.readFileSync(path.join(raiz, 'packages/core/contracts/riesgo.schema.json'), 'utf8'));
  assert.deepStrictEqual(sh.properties.fase.enum, ['', ...I.FASES.Propuesta, ...I.FASES.Proyecto]);
  assert.deepStrictEqual(sh.properties.cat.enum, ['', ...core.HITO.HITO_CATS]);
  assert.deepStrictEqual(sr.properties.cat.enum, core.RIESGO.RISK_CATS); assert.deepStrictEqual(sr.properties.estado.enum, core.RIESGO.RISK_ESTADOS);
  plan0 = JSON.parse(fs.readFileSync(path.join(raiz, 'docs/APIH_iniciativas_con_plan.json'), 'utf8'));
  plan0.iniciativas.forEach(x => { (x.hitos || []).forEach(h => { const hh = Object.assign({ ini: 'PRJ-1' }, h); if (hh.completado && !hh.fechaReal) hh.fechaReal = hh.fecha; assert.deepStrictEqual(core.validarHito(hh), [], 'hito ' + h.nombre); });
    (x.riesgos || []).forEach(r => assert.deepStrictEqual(core.validarRiesgo(Object.assign({ ini: 'PRJ-1', estado: 'Abierto' }, r), 15), [], 'riesgo ' + r.desc)); });
  console.log('✓ esquemas (iniciativa, hito, riesgo) alineados con core ' + core.VERSION.v + '; hitos y riesgos reales válidos');

  // 2) Datos reales: las iniciativas de docs/ cumplen el contrato (area texto → lista, como hará la migración)
  const plan = JSON.parse(fs.readFileSync(path.join(raiz, 'docs/APIH_iniciativas_con_plan.json'), 'utf8'));
  plan.iniciativas.forEach(i => {
    const x = Object.assign({}, i, { area: String(i.area).split(',').map(s => s.trim()) }); delete x.hitos; delete x.riesgos;
    if (!x.lider) x.lider = 'pendiente'; x.origen = 'importación';   // así entra por Administración → Importar
    const e = core.validarIniciativa(x, { nueva: true }); assert.deepStrictEqual(e, [], i.titulo + ': ' + JSON.stringify(e));
    const extra = Object.keys(x).filter(k => !P[k]); assert.deepStrictEqual(extra, [], i.titulo + ' campos fuera del esquema');
  });
  console.log('✓ ' + plan.iniciativas.length + ' iniciativas de docs/ cumplen el contrato');

  // 3) Contrato por adaptador
  const A = require('./adaptadores.js'); const adaptadores = { 'servicio (memoria)': A.servicio, 'http (REST + Static Web Apps)': A.http, 'http + store Azure SQL (ejecutor simulado)': A.sqlSimulado };
  for (const [nombre, fabrica] of Object.entries(adaptadores)) { console.log('Adaptador ' + nombre + ':'); const n = await require('./iniciativa.contract.js')(fabrica); console.log('✓ ' + n + ' casos de contrato'); }
  console.log('Seguridad y protocolo HTTP:'); console.log('✓ ' + await require('./http-seguridad.js')() + ' casos');
  console.log('Adaptador Azure Functions:'); console.log('✓ ' + await require('./functions-adaptador.js')() + ' caso');
})().catch(e => { console.error('✗', e.message); process.exit(1); });
