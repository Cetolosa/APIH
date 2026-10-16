/* C1.0 — Equivalencia packages/core vs. funciones originales de index.html (solo lectura).
 * Uso: TZ=America/Santiago node tests/unit/core-equivalencia.js   (sin dependencias)
 */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const raiz = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const core = require(path.join(raiz, 'packages', 'core', 'apih-core.js'));

// Extrae la línea "const <nombre> = ..." del prototipo
const linea = n => { const m = html.match(new RegExp('^const ' + n + ' = .*$', 'm')); if (!m) throw new Error('No se encontró ' + n + ' en index.html'); return m[0]; };
const nombres = ['pad', 'toISO', 'pD', 'addD', 'diffD', 'expo', 'nivelRiesgo', 'riesgoAbierto'];
const proto = new Function('cfgMi', nombres.map(linea).join('\n') + '\nreturn {' + nombres.join(',') + '};');

let casos = 0;
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); casos++; };

// Fechas: todos los días 2023-01-01..2028-12-31 (bisiestos, cambios de horario de verano en Chile), con saltos variados
const P = proto(() => 15);
const desde = new Date(2023, 0, 1, 12), saltos = [-400, -366, -365, -31, -1, 0, 1, 28, 29, 30, 31, 365, 366, 1000];
for (let d = new Date(desde); d.getFullYear() <= 2028; d.setDate(d.getDate() + 1)) {
  const s = P.toISO(d);
  eq(core.toISO(new Date(d)), s, 'toISO ' + s);
  eq(core.pD(s).getTime(), P.pD(s).getTime(), 'pD ' + s);
  eq(core.pD(s + 'T08:30:00Z').getTime(), P.pD(s + 'T08:30:00Z').getTime(), 'pD datetime ' + s);
  for (const n of saltos) eq(core.addD(s, n), P.addD(s, n), 'addD ' + s + ' ' + n);
  for (const n of saltos) { const o = P.addD(s, n); eq(core.diffD(o, s), P.diffD(o, s), 'diffD ' + o + ' ' + s); }
}
for (const v of [null, undefined, '', 0]) eq(core.pD(v), P.pD(v), 'pD vacío ' + v);
for (const n of [0, 1, 9, 10, 99, '7']) eq(core.pad(n), P.pad(n), 'pad ' + n);

// Riesgo: prob/imp 0..5, umbrales 12, 15, 20 y string (cfg puede venir como texto)
for (const u of [12, 15, 20, '15']) {
  const Pu = proto(k => { assert.strictEqual(k, 'umbralCritico'); return u; });
  for (let p = 0; p <= 5; p++) for (let i = 0; i <= 5; i++) {
    const r = { prob: p, imp: i };
    eq(core.expo(r), Pu.expo(r), 'expo');
    eq(core.nivelRiesgo(core.expo(r), u), Pu.nivelRiesgo(Pu.expo(r)), 'nivel ' + p + 'x' + i + ' u=' + u);
  }
}
for (const e of ['Abierto', 'Cerrado', 'Mitigado', undefined, '']) eq(core.riesgoAbierto({ estado: e }), P.riesgoAbierto({ estado: e }), 'abierto ' + e);

eq(core.VERSION.v, 'C1.0', 'versión');
console.log('OK core ' + core.VERSION.v + ' ≡ index.html ' + core.VERSION.origen + ' — ' + casos + ' casos');
