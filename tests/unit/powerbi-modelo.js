/* C2.10 — Coherencia del modelo de Power BI sin base de datos: cada columna que usan las medidas DAX existe en su vista rpt.*,
 * las vistas del README existen en 003_reportes.sql, los paréntesis cuadran por lote y los montos solo están en fact_finanzas. */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const raiz = path.join(__dirname, '..', '..');
const sql = fs.readFileSync(path.join(raiz, 'db', 'azure-sql', '003_reportes.sql'), 'utf8');
const dax = fs.readFileSync(path.join(raiz, 'powerbi', 'medidas.dax'), 'utf8').replace(/\/\/.*$/gm, '');
const readme = fs.readFileSync(path.join(raiz, 'powerbi', 'README.md'), 'utf8');
let n = 0; const caso = (d, f) => { f(); n++; console.log('  ✓ ' + d); };

/* vistas: nombre → texto del SELECT final */
const vistas = {};
sql.split(/^GO\s*$/m).forEach(b => { const m = b.match(/CREATE OR ALTER VIEW rpt\.(\w+) AS([\s\S]*)$/); if (m) vistas[m[1]] = m[2]; });
/* columnas de salida: alias «AS x» o columna directa «t.x» / «x» en la lista del SELECT de nivel superior */
function columnas(txt) {
  const sel = txt.slice(txt.lastIndexOf('\nSELECT ') + 1); let d = 0, cur = '', partes = [];
  const fin = sel.search(/\n\s*FROM\s/); const lista = sel.slice(7, fin);
  for (const c of lista) { if (c === '(') d++; if (c === ')') d--; if (c === ',' && d === 0) { partes.push(cur); cur = ''; } else cur += c; }
  partes.push(cur);
  return new Set(partes.map(p => p.trim()).map(p => { const a = p.match(/\bAS\s+(\w+)\s*$/i); if (a) return a[1]; const b = p.match(/(?:\w+\.)?(\w+)$/); return b && b[1]; }).filter(Boolean));
}

caso('las 11 vistas del modelo existen', () => {
  const esperadas = ['parametros', 'dim_iniciativa', 'puente_area', 'fact_avance', 'fact_tramos', 'fact_hitos', 'fact_riesgos', 'fact_decisiones', 'fact_compromisos', 'fact_cambios', 'fact_finanzas'];
  esperadas.forEach(v => assert.ok(vistas[v], 'falta rpt.' + v));
  (readme.match(/`(dim_\w+|fact_\w+|puente_\w+|parametros)`/g) || []).map(x => x.replace(/`/g, '')).forEach(v => assert.ok(vistas[v], 'README menciona rpt.' + v + ' inexistente'));
});
caso('cada columna usada en las medidas DAX existe en su vista', () => {
  const refs = [...dax.matchAll(/\b(dim_\w+|fact_\w+|puente_\w+)\[(\w+)\]/g)];
  assert.ok(refs.length > 30);
  for (const [, t, c] of refs) assert.ok(columnas(vistas[t]).has(c), 'rpt.' + t + ' no tiene la columna ' + c + ' (tiene: ' + [...columnas(vistas[t])].join(', ') + ')');
});
caso('paréntesis balanceados en cada lote y un GO entre vistas', () => {
  sql.split(/^GO\s*$/m).forEach((b, i) => { const s = b.replace(/'[^']*'/g, '').replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''); let d = 0; for (const c of s) { if (c === '(') d++; if (c === ')') d--; assert.ok(d >= 0, 'lote ' + i); } assert.strictEqual(d, 0, 'lote ' + i); assert.ok((s.match(/CREATE OR ALTER VIEW/g) || []).length <= 1, 'lote ' + i + ' con dos vistas'); });
});
caso('montos (presupuesto, gastado, beneficio, ahorro) solo en rpt.fact_finanzas', () => {
  for (const [v, t] of Object.entries(vistas)) if (v !== 'fact_finanzas') assert.ok(!/presupuesto|gastado|beneficio|ahorroReal/.test(t), 'rpt.' + v + ' expone montos');
});
caso('reglas iguales a packages/core: hito «Por vencer» ≤ 7 días y niveles de riesgo 10 / 5 / umbral', () => {
  const core = fs.readFileSync(path.join(raiz, 'packages', 'core', 'apih-core.js'), 'utf8');
  assert.ok(/if \(d <= 7\)/.test(core) && /<= 7 THEN 'Por vencer'/.test(vistas.fact_hitos));
  assert.ok(/e >= 10 \? \{ n: 'Alto'/.test(core) && />= 10 THEN 'Alto'/.test(vistas.fact_riesgos));
  assert.ok(/e >= 5 \? \{ n: 'Medio'/.test(core) && />= 5 THEN 'Medio'/.test(vistas.fact_riesgos));
});
console.log('OK powerbi-modelo — ' + n + ' casos');
