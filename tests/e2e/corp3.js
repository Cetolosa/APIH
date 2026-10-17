// C2.11 · Traspaso al Corporativo de V22.55–V22.56: subfases, propuestas como proyectos, Planificación con propuestas y categorías, contra la API real.
// Requiere: APIH_DEV_USER=christian.tolosa@aramark.cl APIH_DEV_ROL=Admin PORT=7072 node services/api/server.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const B = 'http://localhost:7072';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.addInitScript(() => localStorage.setItem('apih_tour22', '1')); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const api = (path, o = {}) => p.evaluate(async ([path, o]) => { const r = await fetch(path, Object.assign({ headers: { 'content-type': 'application/json' } }, o)); return { s: r.status, j: await r.json().catch(() => null) }; }, [path, o]);
  const espera = async () => { await p.waitForTimeout(900); for (let k = 0; k < 40; k++) { const st = await p.evaluate(() => DataService.st.state + '|' + DataService.st.pending + '|' + (DataService.busy ? 1 : 0)); if (/^ok\|0\|0/.test(st)) return st; await p.waitForTimeout(300); } return 'timeout'; };
  await p.goto(B + '/'); await p.waitForTimeout(1500); await espera();
  const r = {};
  await p.evaluate(() => { celebrar = () => {};
    const base = { estado: 'En curso', rag: 'Verde', prioridad: 'Alta', lider: 'Christian Tolosa', area: 'BISE', motivoAlta: 'prueba C2.11', avance: 10, presupuesto: 0, deps: [], tags: [], hist: [], est: [] };
    St.ini.push(Object.assign({ id: 'PRJ-301', tipo: 'Proyecto', titulo: 'Proyecto con subfases', fase: 'Ejecución', inicioPlan: '2026-10-01', finPlan: '2026-12-01' }, base));
    St.ini.push(Object.assign({ id: 'PROP-301', tipo: 'Propuesta', titulo: 'Propuesta con planificación', fase: 'Evaluación', estado: 'Vigente', inicioPlan: '2026-10-05', finPlan: '2026-12-10' }, base, { estado: 'Vigente' }));
    [['HIT-801', 'PRJ-301', 'Plan aprobado', 'Planificación', '2026-10-10', 'Gobierno'], ['HIT-802', 'PRJ-301', 'API lista', 'Ejecución', '2026-11-15', 'Entregable'], ['HIT-803', 'PRJ-301', 'UAT', 'Transición', '2026-11-25', 'Técnico'],
     ['HIT-804', 'PROP-301', 'Evaluación de valor', 'Evaluación', '2026-10-30', 'Entregable'], ['HIT-805', 'PROP-301', 'Comité', 'Aprobación', '2026-12-05', 'Gobierno']]
      .forEach(([id, ini, nombre, fase, fecha, cat]) => St.hitos.push({ id, ini, nombre, fase, fecha, cat, completado: false, fechaReal: null, resp: 'Christian Tolosa' }));
    save(); });
  r.alta = await espera();
  // Subfase desde el formulario: hereda las fechas de la fase y se guarda en el servidor
  await p.evaluate(() => Acts.sfnew({ id: 'PRJ-301', f: 'Ejecución' })); await p.waitForTimeout(200);
  r.hereda = await p.evaluate(() => $('#f_inicio').value + '>' + $('#f_fin').value);
  await p.fill('#f_nombre', 'Sprint 1'); await p.click('[data-act="msave"]'); r.guardaSub = await espera();
  r.subServidor = await api('/api/iniciativas/PRJ-301').then(x => JSON.stringify((x.j.subfases || []).map(s => s.nombre + ' ' + s.inicio + '>' + s.fin)));
  // El servidor también protege las reglas
  const ver = (await api('/api/iniciativas/PRJ-301')).j.version;
  r.servidorFuera = (await api('/api/iniciativas/PRJ-301', { method: 'PATCH', headers: { 'content-type': 'application/json', 'If-Match': '"' + ver + '"' }, body: JSON.stringify({ subfases: [{ id: 'PRJ-301-SF1', nombre: 'Sprint 1', fase: 'Ejecución', inicio: '2026-10-11', fin: '2026-11-30' }] }) })).s;
  r.servidorHitoOtraFase = (await api('/api/iniciativas/PRJ-301/hitos', { method: 'POST', body: JSON.stringify({ nombre: 'X', fase: 'Transición', fecha: '2026-11-20', subfase: 'PRJ-301-SF1' }) })).s;
  r.servidorCatMala = (await api('/api/iniciativas/PRJ-301/hitos', { method: 'POST', body: JSON.stringify({ nombre: 'Y', fase: 'Ejecución', fecha: '2026-11-01', cat: 'Inventada' }) })).s;
  // Una subfase que queda fuera porque se movió un hito no bloquea otras ediciones de la iniciativa
  const h2 = (await api('/api/iniciativas/PRJ-301/hitos')).j.find(h => h.id === 'HIT-802');
  await api('/api/hitos/HIT-802', { method: 'PATCH', headers: { 'content-type': 'application/json', 'If-Match': '"' + h2.version + '"' }, body: JSON.stringify({ fecha: '2026-11-01' }) });
  const v2 = (await api('/api/iniciativas/PRJ-301')).j.version;
  r.editarConSubFuera = (await api('/api/iniciativas/PRJ-301', { method: 'PATCH', headers: { 'content-type': 'application/json', 'If-Match': '"' + v2 + '"' }, body: JSON.stringify({ titulo: 'Proyecto con subfases (editado)' }) })).s;
  // Recargar: todo vuelve desde la API
  await p.reload(); await p.waitForTimeout(1500); await espera();
  r.trasRecargar = await p.evaluate(() => (subfasesDe(byId('PRJ-301'))[0] || {}).nombre + ' · cat ' + St.hitos.find(h => h.id === 'HIT-802').cat);
  await p.evaluate(() => { UI.view = 'gantt'; render(); }); await p.waitForTimeout(300);
  r.ganttAmbos = await p.$$eval('.g-bar', a => a.map(x => x.dataset.id).filter(id => /301/.test(id)).sort().join(','));
  await p.evaluate(() => { UI.view = 'hitos'; F('hitos', {}).cat = 'Gobierno'; render(); }); await p.waitForTimeout(300); r.selectCat = await p.$$eval('[data-v="hitos"][data-f="cat"] option', a => a.length); await p.waitForTimeout(200);
  r.hitosGobierno = await p.$$eval('.tbl tbody tr[data-t="hito"]', a => a.map(x => x.dataset.id).join(',')); r.hitosGobLocal = await p.evaluate(() => St.hitos.filter(h => h.cat === 'Gobierno').map(h => h.id + ':' + h.ini + ':' + !!byId(h.ini)).join(','));
  await p.evaluate(() => { UI.view = 'propuestas'; render(); selectEntity('ini', 'PROP-301', 'resumen'); }); await p.waitForTimeout(300); await p.click('button:has-text("Ficha")'); await p.waitForTimeout(400);
  r.tabsFichaProp = await p.$$eval('.fl2-tab', a => a.map(x => x.textContent.trim()).join('|')); r.fasesProp = await p.$$eval('.fz-steps .fz-step', a => a.length); r.fechaFase = await p.$eval('.fl-ph .fz-rng', e => e.textContent).catch(() => '');
  await p.screenshot({ path: '/tmp/t/corp3.png' });
  r.errores = errs; console.log(JSON.stringify(r, null, 1));
  const ok = /^ok/.test(r.alta) && r.hereda === '2026-10-11>2026-11-15' && /^ok/.test(r.guardaSub) && r.subServidor === '["Sprint 1 2026-10-11>2026-11-15"]' && r.servidorFuera === 422 && r.servidorHitoOtraFase === 422 && r.servidorCatMala === 422
    && r.editarConSubFuera === 200 && r.trasRecargar === 'Sprint 1 · cat Entregable' && r.ganttAmbos === 'PRJ-301,PROP-301' && r.hitosGobierno.split(',').length === 2 && /Planificación/.test(r.tabsFichaProp) && /Hitos/.test(r.tabsFichaProp) && r.fasesProp === 4 && /→/.test(r.fechaFase) && !errs.length;
  console.log(ok ? 'OK corp3' : 'FALLA corp3'); await b.close(); process.exit(ok ? 0 : 1);
})();
