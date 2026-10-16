// C2.6 · Migración limpia: respaldo JSON del Prototipo (V22.54) → «Importar respaldo» de la SPA corporativa → API.
// Requiere: prototipo en http://localhost:8765/demo/index.html y SPA corporativa en :7072 (base vacía, rol Admin).
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'), plan = require('../../docs/APIH_Corporativo_plan_acelerado_C1.3.json').iniciativas[0];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  // 1) Prototipo: datos con historia (iniciativa con avances previos, hitos, riesgos y el resto de colecciones)
  const p = await b.newPage(); await p.addInitScript(() => localStorage.setItem('apih_tour22', '1'));
  await p.goto('http://localhost:8765/demo/index.html'); await p.waitForTimeout(1500);
  const resp = await p.evaluate(x => { celebrar = () => {};
    const n = Object.assign({ id: 'PRJ-050', legacy: '', creada: '2026-08-20', faseDesde: '2026-09-01', origen: 'usuario', est: [], hist: [['2026-08-20', 0], ['2026-09-15', 8], ['2026-10-15', 15]], tags: [], rec: null, folio: '', oc: '', ahorroReal: 0, inicioReal: null, propuestaOrigen: null, estadoMotivo: '', estadoRev: null, gastado: 0, proyecto: null, deps: [], actualizada: '2026-10-15' }, x); delete n.hitos; delete n.riesgos; St.ini.push(n);
    x.hitos.forEach(h => St.hitos.push({ id: nextId('HIT', St.hitos), ini: n.id, nombre: h.nombre, fase: h.fase, fecha: h.fecha, completado: !!h.completado, fechaReal: h.completado ? h.fecha : null, resp: h.resp }));
    x.riesgos.forEach(r => St.riesgos.push(Object.assign({ id: nextId('RSK', St.riesgos), ini: n.id }, r)));
    St.decisiones.push({ id: 'DEC-001', ini: n.id, tipo: 'Iniciar', estado: 'Aprobada', titulo: 'Iniciar APIH Corporativo', fecha: '2026-10-15' });
    St.compromisos.push({ id: 'CMP-001', ini: n.id, texto: 'Enviar propuesta a TI', resp: 'Christian Tolosa', limite: '2026-10-16', estado: 'Pendiente', creada: '2026-10-15' });
    St.cambios.push({ id: 'CAM-001', ini: n.id, tipo: 'Fecha', estado: 'Aprobado', creada: '2026-10-16', motivo: 'Plan acelerado' });
    St.notas.push({ id: 'NOT-001', ini: n.id, area: 'BISE', texto: 'Nota de prueba', autor: 'Christian Tolosa', ts: '2026-10-16T10:00:00' });
    St.documentos.push({ id: 'DOC-001', ini: n.id, nombre: 'Propuesta técnica', tipo: 'Otro', url: 'https://example.com/propuesta' });
    St.comites.push({ id: 'COM-001', fecha: '2026-10-20', participantes: [], tema: 'Revisión del portafolio' });
    log('Cambio', n.id, 'Proyecto importado para prueba de migración');
    return JSON.stringify(St); }, plan);
  fs.writeFileSync('/tmp/t/respaldo_prueba.json', resp); const R = JSON.parse(resp);
  // 2) SPA corporativa: Importar respaldo
  const c = await b.newPage(); const errs = []; c.on('pageerror', e => errs.push(e.message)); await c.addInitScript(() => localStorage.setItem('apih_tour22', '1'));
  await c.goto('http://localhost:7072/'); await c.waitForTimeout(2000);
  const espera = async () => { await c.waitForTimeout(1200); for (let k = 0; k < 60; k++) { const st = await c.evaluate(() => DataService.st.state + '|' + DataService.st.pending + '|' + (DataService.busy ? 1 : 0) + '|' + (DataService.dirty ? 1 : 0)); if (/^(ok|error)\|0\|0\|0/.test(st)) return st; await c.waitForTimeout(300); } return 'timeout'; };
  await espera();
  await c.evaluate(txt => Chg.impfile({ files: [new File([txt], 'respaldo.json', { type: 'application/json' })], value: '' }), resp); await c.waitForTimeout(800);
  await c.getByRole('button', { name: 'Importar', exact: true }).last().click();
  const r = { sync: await espera() }; await c.waitForTimeout(1500); r.sync2 = await espera();
  const api = path => c.evaluate(async path => { const x = await fetch(path); return x.json(); }, path);
  const ini = await api('/api/iniciativas/PRJ-050');
  r.iniciativa = ini.titulo; r.historial = JSON.stringify(ini.hist); r.creada = ini.creada; r.faseDesde = ini.faseDesde; r.origenMigracion = ini.origenMigracion;
  r.hitos = (await api('/api/hitos')).length; r.riesgos = (await api('/api/riesgos')).length;
  for (const l of ['APIH_Decisiones', 'APIH_Compromisos', 'APIH_Cambios', 'APIH_Notas', 'APIH_Documentos', 'APIH_Comites', 'APIH_Bitacora']) r[l] = (await api('/api/registros/' + l)).length;
  r.rechazos = await c.evaluate(() => DataService.ultimoRechazo || ''); r.estado = await c.evaluate(() => JSON.stringify(DataService.st) + ' dirty=' + DataService.dirty + ' busy=' + DataService.busy); r.errores = errs;
  r.esperado = { hitos: R.hitos.length, riesgos: R.riesgos.length, bitacora: R.bitacora.length };
  console.log(JSON.stringify(r, null, 1));
  const ok = r.iniciativa === 'APIH Corporativo' && r.historial === JSON.stringify(R.ini[0].hist) && r.creada === '2026-08-20' && r.faseDesde === '2026-09-01' && r.hitos === R.hitos.length && r.riesgos === R.riesgos.length
    && ['APIH_Decisiones', 'APIH_Compromisos', 'APIH_Cambios', 'APIH_Notas', 'APIH_Documentos', 'APIH_Comites'].every(l => r[l] === 1) && r.APIH_Bitacora === R.bitacora.length && /^ok/.test(r.sync2) && !r.rechazos && !errs.length;
  console.log(ok ? 'OK corp2' : 'FALLA corp2'); await b.close(); process.exit(ok ? 0 : 1);
})();
