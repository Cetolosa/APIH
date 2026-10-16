#!/usr/bin/env node
/* C2.1 — Migración Prototipo (respaldo JSON de Administración › «Respaldo JSON») → script T-SQL para Azure SQL.
 * Uso: node tools/migrar-desde-prototipo.js APIH_respaldo_AAAA-MM-DD.json [salida.sql] [--modificado-por=correo]
 * - Conserva los ids del Prototipo (PRJ-xxx, HIT-xxx…) y reinicia las secuencias después del mayor.
 * - Normaliza: area texto → lista; quita campos internos de la interfaz; completa fechaReal de hitos cumplidos.
 * - Valida cada registro con packages/core; los inválidos se informan y NO se migran (corregir y repetir). */
'use strict';
const fs = require('fs'), path = require('path');
const core = require('../packages/core/apih-core.js');
const S = JSON.parse(fs.readFileSync(path.join(__dirname, '../packages/core/contracts/iniciativa.schema.json'), 'utf8'));
const SH = JSON.parse(fs.readFileSync(path.join(__dirname, '../packages/core/contracts/hito.schema.json'), 'utf8'));
const SR = JSON.parse(fs.readFileSync(path.join(__dirname, '../packages/core/contracts/riesgo.schema.json'), 'utf8'));
const solo = (x, sch) => Object.fromEntries(Object.entries(x).filter(([k, v]) => sch.properties[k] && !sch.properties[k].readOnly && v !== undefined));
const lit = s => "N'" + String(s).replace(/'/g, "''") + "'";

function migrar(St, mp) {
  const umbral = +((St.cfg || {}).umbralCritico) || 15, rep = { ok: { ini: 0, hit: 0, rsk: 0 }, errores: [], avisos: [] }, filas = { iniciativas: [], hitos: [], riesgos: [] };
  const ids = new Set();
  (St.ini || []).forEach(i => {
    const x = solo(Object.assign({}, i, { area: Array.isArray(i.area) ? i.area : String(i.area || 'BISE').split(',').map(s => s.trim()).filter(Boolean) }), S);
    if (x.tipo === 'Proyecto' && !x.motivoAlta && !x.propuestaOrigen && (x.origen || 'usuario') === 'usuario') { x.origen = 'migración'; rep.avisos.push(i.id + ': sin motivoAlta → origen «migración»'); }
    ['inicioPlan', 'finPlan', 'finEst', 'inicioReal', 'finReal', 'estadoRev'].forEach(k => { if (x[k] === '') x[k] = null; });
    const e = core.validarIniciativa(x, {}); if (e.length) return rep.errores.push(i.id + ' «' + i.titulo + '»: ' + e.map(z => z.campo + ' ' + z.regla).join('; '));
    Object.assign(x, { creada: i.creada || null, actualizada: i.actualizada || null, faseDesde: i.faseDesde || null, hist: Array.isArray(i.hist) ? i.hist : [] });
    filas.iniciativas.push([i.id, x]); ids.add(i.id); rep.ok.ini++;
  });
  (St.hitos || []).forEach(h => { if (!ids.has(h.ini)) return rep.avisos.push(h.id + ': su iniciativa ' + h.ini + ' no se migró');
    const x = solo(Object.assign({}, h, { completado: !!h.completado }), SH); if (x.completado && !x.fechaReal) x.fechaReal = x.fecha; if (!x.completado) x.fechaReal = null; if (x.fase == null) x.fase = '';
    const e = core.validarHito(x); if (e.length) return rep.errores.push(h.id + ' «' + h.nombre + '»: ' + e.map(z => z.campo + ' ' + z.regla).join('; '));
    filas.hitos.push([h.id, x]); rep.ok.hit++; });
  (St.riesgos || []).forEach(r => { if (!ids.has(r.ini)) return rep.avisos.push(r.id + ': su iniciativa ' + r.ini + ' no se migró');
    const x = solo(Object.assign({}, r, { prob: +r.prob, imp: +r.imp }), SR);
    const e = core.validarRiesgo(x, umbral); if (e.length) return rep.errores.push(r.id + ' «' + r.desc + '»: ' + e.map(z => z.campo + ' ' + z.regla).join('; '));
    filas.riesgos.push([r.id, x]); rep.ok.rsk++; });
  const max = (arr, pre) => Math.max(0, ...arr.filter(([id]) => id.startsWith(pre + '-')).map(([id]) => +id.split('-')[1] || 0));
  let sql = '/* APIH · migración desde el Prototipo · ' + new Date().toISOString() + ' · ' + rep.ok.ini + ' iniciativas, ' + rep.ok.hit + ' hitos, ' + rep.ok.rsk + ' riesgos */\nSET XACT_ABORT ON;\nBEGIN TRANSACTION;\n';
  for (const [t, L] of Object.entries(filas)) L.forEach(([id, x]) => { sql += 'INSERT INTO apih.' + t + ' (id, doc, modificado_por) VALUES (' + lit(id) + ', ' + lit(JSON.stringify(x)) + ', ' + lit(mp) + ');\n'; });
  [['PROP', filas.iniciativas], ['PRJ', filas.iniciativas], ['HIT', filas.hitos], ['RSK', filas.riesgos]].forEach(([p, L]) => { sql += 'ALTER SEQUENCE apih.seq_' + p + ' RESTART WITH ' + (max(L, p) + 1) + ';\n'; });
  sql += 'COMMIT;\n';
  return { sql, rep, filas };
}
module.exports = migrar;
if (require.main === module) {
  const [ent, sal] = process.argv.slice(2).filter(a => !a.startsWith('--')), mp = (process.argv.find(a => a.startsWith('--modificado-por=')) || '=migracion@aramark.cl').split('=')[1];
  if (!ent) { console.error('Uso: node tools/migrar-desde-prototipo.js respaldo.json [salida.sql]'); process.exit(2); }
  const { sql, rep } = migrar(JSON.parse(fs.readFileSync(ent, 'utf8')), mp);
  fs.writeFileSync(sal || 'apih_migracion.sql', sql);
  console.log('Migrables: ' + rep.ok.ini + ' iniciativas, ' + rep.ok.hit + ' hitos, ' + rep.ok.rsk + ' riesgos → ' + (sal || 'apih_migracion.sql'));
  rep.avisos.forEach(a => console.log('  aviso: ' + a)); rep.errores.forEach(e => console.log('  ✗ ' + e));
  process.exit(rep.errores.length ? 1 : 0);
}
