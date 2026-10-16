'use strict';
/* C2.8 — Genera packages/core/notif-motor.js extrayendo, SIN modificarlas, las funciones de avisos de la SPA corporativa
 * (notifPara y todo lo que usa). Así el servidor calcula exactamente los mismos avisos que ve el usuario en la campana.
 * Uso: node tools/generar-motor-notif.js [--check]   (--check: falla si el archivo generado no está al día)
 * Las funciones extraídas deben ser idénticas en el Prototipo (index.html, solo lectura): lo verifica la prueba e2e notif1. */
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const ORIGEN = path.join(raiz, 'apps', 'corporativo', 'index.html');
const DESTINO = path.join(raiz, 'packages', 'core', 'notif-motor.js');
/* Estado y servicios del navegador: el motor los recibe o los anula. Nombres que coinciden por casualidad con locales: se omiten. */
const OMITIR = ['St', 'FL', 'AuthService', 'APIH_CONFIG', '$', 'para', 'rel'];

function definiciones(src) {
  const re = /^(?:const|let|var|function|async function)\s+([A-Za-z_$][\w$]*)/gm, d = {}; let m;
  while ((m = re.exec(src))) if (!(m[1] in d)) d[m[1]] = m.index;
  return d;
}
/* fin de una sentencia de primer nivel (salta cadenas, plantillas y comentarios) */
function fin(s, i) {
  let d = 0, k = i; const esFn = /^(async )?function/.test(s.slice(i, i + 15));
  const cadena = q => { k++; while (s[k] !== q) { if (s[k] === '\\') k++; k++; } };
  const plantilla = () => { k++; let dd = 0; while (!(s[k] === '`' && dd === 0)) { if (s[k] === '\\') { k += 2; continue; } if (s[k] === '$' && s[k + 1] === '{') { dd++; k += 2; continue; } if (s[k] === '}' && dd > 0) { dd--; k++; continue; } if (dd > 0 && (s[k] === '"' || s[k] === "'")) cadena(s[k]); else if (dd > 0 && s[k] === '`') { k++; while (s[k] !== '`') { if (s[k] === '\\') k++; k++; } } k++; } };
  for (; k < s.length; k++) {
    const c = s[k];
    if (c === '/' && s[k + 1] === '/') { k = s.indexOf('\n', k) - 1; continue; }
    if (c === '/' && s[k + 1] === '*') { k = s.indexOf('*/', k) + 1; continue; }
    if (c === '"' || c === "'") { cadena(c); continue; }
    if (c === '`') { plantilla(); continue; }
    if ('([{'.includes(c)) d++;
    if (')]}'.includes(c)) { d--; if (d === 0 && esFn && c === '}') return k + 1; }
    if (d === 0 && !esFn && c === ';') return k + 1;
    if (d === 0 && !esFn && c === '\n') { const nx = s.slice(k + 1).match(/^\s*(\S)/); if (nx && !'.?:+-*|&,'.includes(nx[1])) return k; }
  }
  return k;
}
function extraer(src, raices) {
  const defs = definiciones(src), vistos = new Set(), orden = [], cola = raices.slice();
  while (cola.length) {
    const n = cola.shift(); if (vistos.has(n) || OMITIR.includes(n) || !(n in defs)) continue; vistos.add(n);
    const codigo = src.slice(defs[n], fin(src, defs[n])); orden.push({ n, pos: defs[n], codigo });
    new Set(codigo.match(/[A-Za-z_$][\w$]*/g)).forEach(x => { if (x !== n && x in defs && !vistos.has(x)) cola.push(x); });
  }
  return orden.sort((a, b) => a.pos - b.pos);   // orden original del archivo (las const deben existir antes de usarse)
}
function generar() {
  const src = fs.readFileSync(ORIGEN, 'utf8'), ver = (src.match(/VER = \{ v: '([^']+)'/) || [])[1] || '?';
  const partes = extraer(src, ['notifPara', 'notifPref', 'NOTIF_GRUPOS', 'NOTIF_DEST']);
  return `/* ARCHIVO GENERADO por tools/generar-motor-notif.js desde apps/corporativo/index.html (${ver}). NO EDITAR A MANO.
 * Motor de notificaciones: mismas reglas que la campana de la SPA, para que el servidor envíe correo / Teams.
 * crearMotor(datos, usuario, hoyISO) → { avisos(): [{ key, tipo, g, sev, ini, titulo, texto, ts, canales }] }
 * «datos» = colecciones de APIH con la forma de la SPA (ini, hitos, riesgos, decisiones, compromisos, cambios, bitacora, comites, usuarios, cfg, cfgU). */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.APIHNotifMotor = factory(); })(this, function () {
function crearMotor(datos, usuario, hoyISO) {
  const St = Object.assign({ ini: [], hitos: [], riesgos: [], decisiones: [], compromisos: [], cambios: [], bitacora: [], comites: [], usuarios: [], cfgU: {} }, datos);
  St.cfg = Object.assign({}, datos.cfg || {}, { hoyFija: hoyISO });
  const FL = { resp: '', mine: false, verComo: usuario };   /* el servidor «ve como» cada destinatario */
  const AuthService = undefined, APIH_CONFIG = {};
  const _ix = {};
${partes.map(p => p.codigo).join('\n')}
  return { avisos: () => notifPara(usuario), NOTIF, NOTIF_CANALES, NOTIF_GRUPOS };
}
return { crearMotor, ORIGEN: ${JSON.stringify(ver)}, FUNCIONES: ${JSON.stringify(partes.map(p => p.n))} };
});
`;
}
if (require.main === module) {
  const txt = generar();
  if (process.argv.includes('--check')) {
    const actual = fs.existsSync(DESTINO) ? fs.readFileSync(DESTINO, 'utf8') : '';
    if (actual !== txt) { console.error('notif-motor.js no está al día: node tools/generar-motor-notif.js'); process.exit(1); }
    console.log('OK notif-motor al día');
  } else { fs.writeFileSync(DESTINO, txt); console.log('OK ' + path.relative(raiz, DESTINO) + ' — ' + require(DESTINO).FUNCIONES.length + ' funciones'); }
}
module.exports = { generar, extraer, definiciones };
