/* C1.4 — Equivalencia: gates, hitoEstado, riesgoSinMit y fasesVentana del core vs. index.html V22.54 (solo lectura).
 * Uso: node tests/unit/core-equivalencia-c14.js   (sin dependencias; casos aleatorios con semilla fija) */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const raiz = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const core = require(path.join(raiz, 'packages', 'core', 'apih-core.js'));

const linea = n => { const m = html.match(new RegExp('^const ' + n + ' = .*$', 'm')); if (!m) throw new Error('No está ' + n); return m[0]; };
const funcion = n => { const a = html.indexOf('function ' + n + '('); if (a < 0) throw new Error('No está ' + n); let i = html.indexOf('{', a), d = 0;
  for (let k = i; k < html.length; k++) { if (html[k] === '{') d++; else if (html[k] === '}') { d--; if (!d) return html.slice(a, k + 1); } } };
const src = [linea('pad'), linea('toISO'), linea('pD'), linea('addD'), linea('diffD'), linea('expo'), linea('riesgoAbierto'), linea('by'),
  linea('FASES_PROP'), linea('FASES_PRJ'), linea('FASE_COLOR'), linea('esProp'), linea('fasesDe'), linea('riesgoSinMit'),
  funcion('gates'), funcion('hitoEstado'), funcion('fasesVentana')].join('\n');
const proto = new Function('S', 'const hoy = () => S.hoy, cfgI = () => S.umbral, hitosDe = () => S.hitos, riesgosDe = () => S.riesgos, rel = () => "REL";\n' + src +
  '\nreturn { gates, hitoEstado, fasesVentana, riesgoSinMit };');

let seed = 42; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = a => a[Math.floor(rnd() * a.length)], maybe = (v, p = 0.5) => rnd() < p ? v : undefined;
const fecha = () => core.addD('2026-09-01', Math.floor(rnd() * 160));
let casos = 0; const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); casos++; };

for (let n = 0; n < 4000; n++) {
  const tipo = pick(['Propuesta', 'Proyecto']), FS = tipo === 'Propuesta' ? core.INICIATIVA.FASES.Propuesta : core.INICIATIVA.FASES.Proyecto;
  const ini = maybe(fecha(), 0.85), fin = maybe(fecha(), 0.85);
  const i = { id: 'X-1', tipo, fase: pick(FS), avance: pick([0, 15, 79, 80, 99, 100]), presupuesto: pick([0, 0, 10]), beneficio: pick([0, 5]), categoria: pick(['Transversal', 'Operación']),
    lider: maybe('Ana'), sponsor: maybe('Luis'), problema: maybe('p', 0.3), desc: maybe('d', 0.5), bc: maybe('bc'), score: maybe({ valor: 3 }), inicioPlan: ini, finPlan: fin };
  const hitos = Array.from({ length: Math.floor(rnd() * 9) }, (_, k) => { const c = rnd() < 0.4, f = fecha(); return { id: 'H' + k, fase: pick([...FS, '', undefined]), fecha: f, completado: c, fechaReal: c ? pick([f, core.addD(f, 3), core.addD(f, -2)]) : null }; });
  const riesgos = Array.from({ length: Math.floor(rnd() * 6) }, (_, k) => ({ id: 'R' + k, prob: 1 + Math.floor(rnd() * 5), imp: 1 + Math.floor(rnd() * 5), estado: pick(['Abierto', 'En mitigación', 'Cerrado', 'Materializado']), mit: pick(['', '  ', 'plan']) }));
  const S = { hoy: fecha(), umbral: pick([12, 15, 20]), hitos, riesgos }, P = proto(S), ctx = { hitos, riesgos, hoy: S.hoy, umbral: S.umbral };
  for (const to of FS) eq(core.gates(i, to, ctx), P.gates(i, to), 'gates ' + n + ' → ' + to);
  eq(JSON.parse(JSON.stringify(core.fasesVentana(i, hitos))), JSON.parse(JSON.stringify(P.fasesVentana(i))), 'fasesVentana ' + n);
  hitos.forEach(h => { const a = core.hitoEstado(h, S.hoy), b = P.hitoEstado(h); eq([a.k, a.c], [b.k, b.c], 'hitoEstado ' + n); if (a.k !== 'soon') eq(a.t, b.t, 'texto hitoEstado ' + n); });
  riesgos.forEach(r => eq(core.riesgoSinMit(r, S.umbral), P.riesgoSinMit(i, r), 'riesgoSinMit ' + n));
}
console.log('OK core ' + core.VERSION.v + ' ≡ index.html ' + core.VERSION.origen + ' (gates, fasesVentana, hitoEstado, riesgoSinMit) — ' + casos + ' casos');
