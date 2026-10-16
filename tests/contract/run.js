/* C1.1 — Ejecuta esquema + contrato. Uso: node tests/contract/run.js */
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const core = require('../../packages/core/apih-core.js');
const raiz = path.join(__dirname, '..', '..');
const schema = JSON.parse(fs.readFileSync(path.join(raiz, 'packages/core/contracts/iniciativa.schema.json'), 'utf8'));

(async () => {
  // 1) El esquema y el core no se desalinean (mismas listas de valores)
  const I = core.INICIATIVA, P = schema.properties;
  assert.deepStrictEqual(P.fase.enum, [...I.FASES.Propuesta, ...I.FASES.Proyecto]);
  assert.deepStrictEqual(P.estado.enum, [...I.ESTADOS.Propuesta, ...I.ESTADOS.Proyecto]);
  assert.deepStrictEqual(P.rag.enum, I.RAGS); assert.deepStrictEqual(P.prioridad.enum, I.PRIOS); assert.deepStrictEqual(P.moneda.enum, I.MONEDAS);
  for (const T of ['Propuesta', 'Proyecto']) { const r = schema.allOf.find(x => x.if.properties.tipo.const === T).then.properties; assert.deepStrictEqual(r.fase.enum, I.FASES[T]); assert.deepStrictEqual(r.estado.enum, I.ESTADOS[T]); }
  assert.ok(schema.$id.endsWith(core.VERSION.v), 'versión del esquema ' + schema.$id + ' ≠ core ' + core.VERSION.v);
  console.log('✓ esquema alineado con core ' + core.VERSION.v);

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
  const adaptadores = { memoria: require('./adaptador-memoria.js') };
  for (const [nombre, fabrica] of Object.entries(adaptadores)) { console.log('Adaptador ' + nombre + ':'); const n = await require('./iniciativa.contract.js')(fabrica); console.log('✓ ' + n + ' casos de contrato'); }
})().catch(e => { console.error('✗', e.message); process.exit(1); });
