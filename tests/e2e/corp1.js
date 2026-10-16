// C2.2 · SPA corporativa (apps/corporativo) contra la API real en local, con sesión simulada de Static Web Apps.
// Requiere: APIH_DEV_USER=christian.tolosa@aramark.cl APIH_DEV_ROL=Editor PORT=7072 node services/api/server.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const B = 'http://localhost:7072';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.addInitScript(() => localStorage.setItem('apih_tour22', '1')); const errs = [], csp = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/Content Security Policy|Refused/i.test(m.text())) csp.push(m.text().slice(0, 120)); });
  const api = (path, o = {}) => p.evaluate(async ([path, o]) => { const r = await fetch(path, Object.assign({ headers: { 'content-type': 'application/json' } }, o)); return { s: r.status, j: await r.json().catch(() => null) }; }, [path, o]);
  const espera = async () => { await p.waitForTimeout(900); for (let k = 0; k < 40; k++) { const st = await p.evaluate(() => DataService.st.state + '|' + DataService.st.pending + '|' + (DataService.busy ? 1 : 0) + '|' + (DataService.dirty ? 1 : 0)); if (/^(ok|error)\|0\|0\|0/.test(st) || /^error/.test(st)) return st; await p.waitForTimeout(250); } return p.evaluate(() => JSON.stringify(DataService.st)); };
  await p.goto(B + '/'); await p.waitForTimeout(1500);
  const r = {};
  r.version = await p.evaluate(() => document.title + ' | ' + (document.body.innerText.match(/C2\.\d[^\n]*/) || [''])[0]);
  r.modo = await p.evaluate(() => DataService.mode + ' · ' + DataService.st.msg + ' · ' + (AuthService.user() || {}).email);
  r.estado0 = await espera();
  // Alta de un proyecto desde la SPA (mismo camino que el formulario: St + save)
  await p.evaluate(() => { St.ini.push({ id: 'PRJ-101', tipo: 'Proyecto', titulo: 'Prueba corporativa', fase: 'Planificación', estado: 'En curso', rag: 'Verde', prioridad: 'Alta', lider: 'Christian Tolosa', area: 'BISE', motivoAlta: 'prueba e2e', avance: 0, presupuesto: 0, inicioPlan: '2026-10-16', finPlan: '2026-12-04', deps: [], hist: [], est: [], creada: hoy(), actualizada: hoy() });
    St.hitos.push({ id: 'HIT-201', ini: 'PRJ-101', nombre: 'Kickoff', fase: 'Planificación', fecha: '2026-10-20', completado: false, fechaReal: null, resp: 'Christian Tolosa' });
    St.riesgos.push({ id: 'RSK-301', ini: 'PRJ-101', desc: 'Riesgo de prueba', cat: 'Técnico', prob: 3, imp: 3, estado: 'Abierto', dueno: 'Christian Tolosa', fIdent: '2026-10-16', fRev: '2026-10-30', mit: '' }); save(); });
  r.estado1 = await espera();
  const g = await api('/api/iniciativas/PRJ-101'); r.servidor = g.s + ' ' + (g.j && g.j.titulo) + ' · área ' + JSON.stringify(g.j && g.j.area) + ' · por ' + (g.j && g.j.modificadoPor);
  r.hitosServidor = (await api('/api/iniciativas/PRJ-101/hitos')).j.length;
  // Cambio de estado (va por /estado) y edición normal (va por PATCH)
  await p.evaluate(() => { const i = St.ini.find(x => x.id === 'PRJ-101'); i.estado = 'Pausado'; i.estadoMotivo = 'Esperando a TI'; i.estadoRev = '2026-10-23'; i.titulo = 'Prueba corporativa (editada)'; save(); });
  r.estado2 = await espera(); const g2 = (await api('/api/iniciativas/PRJ-101')).j; r.trasEditar = g2.estado + ' · ' + g2.titulo + ' · ' + g2.estadoMotivo;
  // El servidor manda: avanzar de fase sin cumplir la compuerta se rechaza
  await p.evaluate(() => { const i = St.ini.find(x => x.id === 'PRJ-101'); i.estado = 'En curso'; i.estadoMotivo = ''; i.estadoRev = null; i.fase = 'Ejecución'; save(); });
  await espera(); await p.waitForTimeout(800); await espera(); r.rechazo = await p.evaluate(() => DataService.ultimoRechazo || ''); r.faseServidor = (await api('/api/iniciativas/PRJ-101')).j.fase; r.faseLocal = await p.evaluate(() => St.ini.find(x => x.id === 'PRJ-101').fase);
  // Un usuario sin rol de APIH recibe 403; una versión vieja recibe 409
  r.conflicto = (await api('/api/iniciativas/PRJ-101', { method: 'PATCH', headers: { 'content-type': 'application/json', 'If-Match': '"vieja"' }, body: JSON.stringify({ titulo: 'x' }) })).s;
  // Recargar: los datos vuelven desde Azure (API), no del navegador
  await p.reload(); await p.waitForTimeout(1500); r.estado3 = await espera();
  r.trasRecargar = await p.evaluate(() => { const i = St.ini.find(x => x.id === 'PRJ-101'); return i ? i.titulo + ' · ' + i.area + ' · hitos ' + St.hitos.filter(h => h.ini === 'PRJ-101').length : 'no está'; });
  r.registros = (await api('/api/registros/APIH_Config')).s;
  r.errores = errs; r.csp = csp; console.log(JSON.stringify(r, null, 1));
  const ok = /C2\.\d/.test(r.version) && /^api/.test(r.modo) && /^ok/.test(r.estado0) && /^200 Prueba corporativa/.test(r.servidor) && /\["BISE"\]/.test(r.servidor) && r.hitosServidor === 1 && /^Pausado · Prueba corporativa \(editada\)/.test(r.trasEditar) && /Compuerta/.test(r.rechazo) && r.faseServidor === 'Planificación' && r.faseLocal === 'Planificación' && r.conflicto === 409 && /editada.*BISE.*hitos 1/.test(r.trasRecargar) && !errs.length && !csp.length;
  console.log(ok ? 'OK corp1' : 'FALLA corp1'); await b.close(); process.exit(ok ? 0 : 1);
})();
