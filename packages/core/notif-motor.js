/* ARCHIVO GENERADO por tools/generar-motor-notif.js desde apps/corporativo/index.html (C2.28). NO EDITAR A MANO.
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
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MES3 = MESES.map(m => m.slice(0, 3));
const pad = n => String(n).padStart(2, '0');
const toISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const pD = s => { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d, 12); };
const diffD = (a, b) => Math.round((pD(a) - pD(b)) / 864e5);
const fmtD = s => { if (!s) return '—'; const d = pD(s); return pad(d.getDate()) + ' ' + MES3[d.getMonth()].toLowerCase() + ' ' + String(d.getFullYear()).slice(2); };
const hoy = () => (St && St.cfg.hoyFija) || toISO(new Date());
const FASES_ACT = ['Planificación', 'Ejecución', 'Transición'];
const EST_FINAL = { Propuesta: ['Aprobada', 'Rechazada', 'Retirada'], Proyecto: ['Completado', 'Cancelado'] };
const esProp = i => !!i && i.tipo === 'Propuesta';
const byId = id => St.ini.find(i => i.id === id);
function audParse(texto) {
  const m = /^(Hito|Riesgo|Decisión|Compromiso|Cambio) «(.*?)» — /.exec(texto || '');
  const ent = m ? m[2] : '', body = m ? texto.slice(m[0].length) : (texto || '');
  const rows = body.split(' | ').map(x => { const a = x.indexOf(': '), b = x.indexOf(' → '); return a > 0 && b > a ? [x.slice(0, a), x.slice(a + 2, b), x.slice(b + 3)] : null; });
  return { ent, kind: m ? m[1] : 'Iniciativa', rows: rows.every(Boolean) ? rows : null, raw: body };
}
const isDone = i => EST_FINAL[esProp(i) ? 'Propuesta' : 'Proyecto'].includes(i.estado);
const esSB = i => !!i && i.estado === 'Stand By';
const isLive = i => !isDone(i) && !esSB(i);
const isActive = i => !esProp(i) && FASES_ACT.includes(i.fase) && i.estado === 'En curso';
const ADMIN_USERS = ['Christian Tolosa'];
const miUsuario = () => FL.verComo || St.cfg.usuario;
const respSel = () => FL.mine ? miUsuario() : FL.resp;
const ADMIN_EMAILS = ['tolosa-christian@aramark.cl'];
const _nrm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
function esAdminReal() {   // tolerante: «Christian Tolosa Delpino», mayúsculas, tildes o correo
  const u = _nrm(St.cfg.usuario), au = (typeof AuthService !== 'undefined' && AuthService.user && AuthService.user()) || null, em = _nrm(au && (au.email || au.username));
  if (au && AuthService.provider === 'swa') return (AuthService.acct && AuthService.acct.roles || []).includes('apih-admin');   /* Corporativo: el rol sale de Entra (grupo APIH-Admin) */
  // S-17: con sesión autenticada, el administrador se decide solo por el correo de la sesión (el nombre lo escribe cualquiera)
  if (au) return !!em && ADMIN_EMAILS.some(e => _nrm(e) === em);
  return ADMIN_USERS.some(a => { const n = _nrm(a); return u === n || u.startsWith(n + ' '); });   // sin sesión (demo/local) solo
}
let _PP = null;
function personProjects(n) {
  if (!_PP) {
    _PP = {}; const add = (nm, id) => { if (nm && id) (_PP[nm] = _PP[nm] || new Set()).add(id); };
    St.ini.forEach(i => [i.lider, i.sponsor, i.negocio, i.propuestoPor, i.solicita].forEach(nm => String(nm || '').split(/\s+-\s+|,/).forEach(x => add(x.trim(), i.id))));
    St.hitos.forEach(h => add(h.resp, h.ini)); St.riesgos.forEach(r => add(r.dueno, r.ini)); DECS().forEach(d => add(d.solicita, d.ini));
    St.comites.forEach(c => [...(c.acciones || []), ...(c.compromisos || [])].forEach(a => add(a.resp, a.ini)));
  }
  return _PP[n] || new Set();
}
const respOk = i => { const r = respSel(); return !r || personProjects(r).has(i.id); };
const inArea = i => (St.cfg.areaGlobal === 'Todas' || (i.area || '').split(',').map(x => x.trim()).includes(St.cfg.areaGlobal)) && respOk(i) && (!PRES_MIO || _nrm(i.lider) === _nrm(miUsuario())) && (typeof areaVisible !== 'function' || areaVisible(i.area));
const scopeP = () => St.ini.filter(i => esProp(i) && !esSB(i) && inArea(i));
const DECS = () => St.decisiones.filter(x => !esSB(byId(x.ini)));
const CAMBIOS = () => St.cambios.filter(x => !esSB(byId(x.ini)));
const ACUERDOS = () => St.compromisos.filter(x => !esSB(byId(x.ini)));
let _ixGen = 0;
const _porIni = (k, id) => { const arr = St[k]; let c = _ix[k]; if (!c || c.arr !== arr || c.n !== arr.length || c.g !== _ixGen) { const m = new Map(); arr.forEach(x => { let l = m.get(x.ini); if (!l) m.set(x.ini, l = []); l.push(x); }); _ix[k] = c = { arr, n: arr.length, g: _ixGen, m }; } return (c.m.get(id) || []).slice(); };
const hitosDe = id => _porIni('hitos', id);
function forecast(i) {   // fin proyectado
  if (i.estado === 'Completado') return i.finReal || i.finEst || i.finPlan;
  let f = i.finEst || i.finPlan;
  const open = hitosDe(i.id).filter(h => !h.completado).map(h => h.fecha);
  if (open.length) { const m = open.reduce((a, b) => a > b ? a : b); if (FASES_ACT.includes(i.fase) && m > f) f = m; }
  if (isLive(i) && FASES_ACT.includes(i.fase) && i.avance < 100 && f < hoy()) f = hoy();
  return f;
}
const desv = i => (i.finPlan && forecast(i)) ? Math.max(0, diffD(forecast(i), i.finPlan)) : 0;
const atrasado = i => isLive(i) && FASES_ACT.includes(i.fase) && desv(i) > cfgI(i,'tolDesv');
const esperado = i => {   // avance esperado lineal
  const s = i.inicioPlan, e = i.finPlan; if (!s || !e) return 0; const t = diffD(hoy(), s), T = Math.max(1, diffD(e, s));
  return Math.max(0, Math.min(100, t / T * 100));
};
const expo = r => r.prob * r.imp;
const riesgoAbierto = r => r.estado !== 'Cerrado';
const diasSinUpd = i => i.actualizada ? diffD(hoy(), i.actualizada) : 999;
const diasEnFase = i => diffD(hoy(), i.faseDesde || i.actualizada || i.creada || hoy());
const NOTIF_CANALES = [['app', 'En la app', true], ['correo', 'Correo', false], ['teams', 'Teams', false]];
const NOTIF_DEST = [['lider', 'Líder'], ['sponsor', 'Sponsor'], ['resp', 'Responsable directo'], ['pmo', 'PMO (Gasto)']];
const NOTIF_GRUPOS = { plazos: 'Plazos y compromisos', riesgos: 'Riesgos y decisiones', salud: 'Salud y avance', colab: 'Colaboración', gob: 'Gobierno y cambios' };
const NOTIF = [
  { id: 'hito_prox', g: 'plazos', l: 'Hito por vencer', d: 'Un hito pendiente vence en los próximos días.', sev: 1, on: true, dest: ['resp', 'lider'], dias: 3, diasL: 'días de anticipación' },
  { id: 'hito_venc', g: 'plazos', l: 'Hito vencido', d: 'Un hito de un proyecto en curso pasó su fecha sin completarse.', sev: 2, on: true, dest: ['resp', 'lider'] },
  { id: 'comp_prox', g: 'plazos', l: 'Compromiso por vencer', d: 'Un compromiso abierto vence en los próximos días.', sev: 1, on: true, dest: ['resp'], dias: 3, diasL: 'días de anticipación' },
  { id: 'comp_venc', g: 'plazos', l: 'Compromiso vencido', d: 'Un compromiso abierto pasó su fecha límite.', sev: 2, on: true, dest: ['resp', 'pmo'] },
  { id: 'riesgo_crit', g: 'riesgos', l: 'Riesgo crítico abierto', d: 'Un riesgo abierto supera el umbral de exposición crítica.', sev: 3, on: true, dest: ['resp', 'lider'] },
  { id: 'dec_venc', g: 'riesgos', l: 'Decisión vencida', d: 'Una decisión pendiente pasó su fecha límite.', sev: 2, on: true, dest: ['resp', 'pmo'] },
  { id: 'atraso', g: 'salud', l: 'Proyecto atrasado', d: 'La fecha proyectada supera la tolerancia de desviación.', sev: 2, on: true, dest: ['lider', 'sponsor'] },
  { id: 'sin_update', g: 'salud', l: 'Proyecto sin actualización', d: 'Se superó el plazo sin actualizar el avance.', sev: 1, on: true, dest: ['lider'] },
  { id: 'prop_estancada', g: 'salud', l: 'Propuesta estancada', d: 'Una propuesta lleva más días de lo esperado en su fase.', sev: 1, on: false, dest: ['lider'] },
  { id: 'ev_rag', g: 'salud', l: 'Salud pasa a Rojo', d: 'Un proyecto cambió su RAG a Rojo (últimos 14 días).', sev: 3, on: true, dest: ['lider', 'sponsor', 'pmo'], ev: true },
  { id: 'ev_fase', g: 'salud', l: 'Cambio de fase', d: 'Una iniciativa avanzó de fase (últimos 14 días).', sev: 1, on: true, dest: ['lider', 'sponsor'], ev: true },
  { id: 'ev_asigna', g: 'colab', l: 'Te asignaron como responsable', d: 'Quedaste como responsable o dueño de una iniciativa, hito o riesgo.', sev: 1, on: true, dest: ['resp'], ev: true, fijoDest: true },
  { id: 'ev_comentario', g: 'colab', l: 'Comentario nuevo', d: 'Otra persona comentó una iniciativa que lideras o patrocinas.', sev: 1, on: true, dest: ['lider', 'sponsor'], ev: true },
  { id: 'cambio_pend', g: 'gob', l: 'Solicitud de cambio pendiente', d: 'Hay una solicitud de cambio esperando aprobación.', sev: 2, on: true, dest: ['pmo'] },
  { id: 'cambio_res', g: 'gob', l: 'Solicitud de cambio resuelta', d: 'Se aprobó o rechazó una solicitud que hiciste (últimos 14 días).', sev: 1, on: true, dest: ['resp'], ev: true, fijoDest: true }
];
const NOTIF_VENT = 14;
const rolDeUser = n => { const k = _nrm(n); if (ADMIN_USERS.some(a => _nrm(a) === k)) return 'Gasto'; const u = St.usuarios.find(x => _nrm(x.n) === k); return u && PERM_ROLES.includes(u.rol) ? u.rol : 'Colaborador'; };
function notifPref(id, user) {
  const c = NOTIF.find(x => x.id === id), o = ((St.cfg.notif || {}).tipos || {})[id] || {}, p = (((cfgUOf(user).notif || {}).tipos) || {})[id] || {};
  const can = Object.assign({ app: true, correo: false, teams: false }, o.canales || {}, p.canales || {});
  return { on: p.on != null ? p.on : o.on != null ? o.on : c.on, dest: o.dest || c.dest, dias: o.dias != null ? o.dias : c.dias, canales: can };
}
function notifPara(user) {
  if (!St || !user) return [];
  const u = _nrm(user), hy = hoy(), rol = rolDeUser(user), out = [];
  const visible = i => i && areaVisible(i.area);
  /* rel(i, extra): relación de «user» con la iniciativa/ítem → lista de roles que cumple */
  const rel = (i, resp) => { const r = []; if (i && _nrm(i.lider) === u) r.push('lider'); if (i && _nrm(i.sponsor) === u) r.push('sponsor'); if (resp && _nrm(resp) === u) r.push('resp'); if (rol === 'Gasto') r.push('pmo'); return r; };
  const aplica = (id, i, resp) => { const p = notifPref(id, user); if (!p.on) return false; const r = rel(i, resp); return p.dest.some(k => r.includes(k)); };
  const add = (id, key, i, texto, extra) => { const c = NOTIF.find(x => x.id === id); out.push(Object.assign({ key: id + ':' + key, tipo: id, g: c.g, sev: c.sev, ini: i ? i.id : null, titulo: c.l, texto, ts: hy }, extra || {})); };
  const vivas = St.ini.filter(i => isLive(i) && visible(i));
  /* --- reglas --- */
  const pH = notifPref('hito_prox', user).dias, pC = notifPref('comp_prox', user).dias;
  St.hitos.filter(h => !h.completado).forEach(h => {
    const i = byId(h.ini); if (!i || !isLive(i) || !visible(i) || i.estado !== 'En curso') return;
    const d = diffD(h.fecha, hy);
    if (d < 0 && aplica('hito_venc', i, h.resp)) add('hito_venc', h.id, i, `«${h.nombre}» venció hace ${-d} d (${fmtD(h.fecha)}) · ${i.titulo}`, { ts: h.fecha, sev: -d > 30 ? 3 : 2 });
    else if (d >= 0 && d <= pH && aplica('hito_prox', i, h.resp)) add('hito_prox', h.id, i, `«${h.nombre}» vence ${d === 0 ? 'hoy' : 'en ' + d + ' d'} (${fmtD(h.fecha)}) · ${i.titulo}`, { ts: h.fecha });
  });
  ACUERDOS().filter(a => a.estado === 'Abierto' && a.limite).forEach(a => {
    const i = byId(a.ini); if (a.ini && !visible(i)) return; const d = diffD(a.limite, hy);
    if (d < 0 && aplica('comp_venc', i, a.resp)) add('comp_venc', a.id, i, `«${cut(a.texto, 70)}» venció hace ${-d} d · ${a.resp || 'sin responsable'}`, { ts: a.limite });
    else if (d >= 0 && d <= pC && aplica('comp_prox', i, a.resp)) add('comp_prox', a.id, i, `«${cut(a.texto, 70)}» vence ${d === 0 ? 'hoy' : 'en ' + d + ' d'} · ${a.resp || 'sin responsable'}`, { ts: a.limite });
  });
  St.riesgos.filter(r => riesgoAbierto(r)).forEach(r => { const i = byId(r.ini); if (!i || !isLive(i) || !visible(i)) return; const e = expo(r); if (e >= cfgI(i, 'umbralCritico') && aplica('riesgo_crit', i, r.dueno)) add('riesgo_crit', r.id, i, `Exposición ${e}: ${cut(r.desc, 80)} · ${i.titulo}`, { ts: r.fIdent || hy }); });
  DECS().filter(d => d.estado === 'Pendiente' && d.limite && d.limite < hy).forEach(d => { const i = byId(d.ini); if (d.ini && !visible(i)) return; if (aplica('dec_venc', i, d.solicita)) add('dec_venc', d.id, i, `«${cut(d.titulo, 70)}» venció hace ${diffD(hy, d.limite)} d`, { ts: d.limite }); });
  vivas.filter(isActive).forEach(i => {
    if (atrasado(i) && aplica('atraso', i)) add('atraso', i.id, i, `${i.titulo}: +${desv(i)} d sobre el plan`);
    const du = diasSinUpd(i); if (du > cfgI(i, 'diasSinUpdate') && aplica('sin_update', i)) add('sin_update', i.id, i, `${i.titulo}: ${du >= 999 ? 'sin registro de actualización' : du + ' d sin actualizar'}`);
  });
  scopeP().filter(i => isLive(i) && visible(i) && i.estado === 'Vigente').forEach(i => { const d = diasEnFase(i), amb = cfgI(i, 'propDiasAmb') || 30; if (d > amb && aplica('prop_estancada', i)) add('prop_estancada', i.id, i, `${i.titulo}: ${d} d en la fase ${i.fase}`); });
  CAMBIOS().filter(c => c.estado === 'Solicitado').forEach(c => { const i = byId(c.ini); if (!visible(i)) return; if (aplica('cambio_pend', i, c.aprobador)) add('cambio_pend', c.id, i, `${c.tipo}: ${cut(c.desc || c.id, 70)} · pide ${c.solicita || '—'}`, { ts: c.creada || hy }); });
  /* --- eventos (últimos NOTIF_VENT días; no avisan al autor del cambio) --- */
  CAMBIOS().filter(c => c.estado !== 'Solicitado' && c.fDec && diffD(hy, c.fDec) <= NOTIF_VENT).forEach(c => { const i = byId(c.ini); if (!visible(i)) return; if (aplica('cambio_res', i, c.solicita)) add('cambio_res', c.id, i, `Tu solicitud de ${String(c.tipo).toLowerCase()} fue ${String(c.estado).toLowerCase()} · ${cut(c.desc || c.id, 60)}`, { ts: c.fDec }); });
  St.bitacora.forEach(b => {
    if (!b.ini || diffD(hy, String(b.ts).slice(0, 10)) > NOTIF_VENT || _nrm(b.autor) === u) return;
    const i = byId(b.ini); if (!visible(i)) return; const ts = String(b.ts).slice(0, 10), T = b.texto || '';
    if (b.tipo === 'Comentario' && !/^Estrella Michelin/.test(T) && aplica('ev_comentario', i)) add('ev_comentario', b.id, i, `${b.autor}: «${cut(T, 90)}» · ${i.titulo}`, { ts });
    if (b.tipo === 'Cambio' && /^Cambio de fase/.test(T) && aplica('ev_fase', i)) add('ev_fase', b.id, i, `${i.titulo}: ${T.replace(/^Cambio de fase: /, '').replace(/ \(forzado.*$/, '')}`, { ts });
    if (b.tipo === 'Cambio' && /^RAG .*→ Rojo/.test(T) && aplica('ev_rag', i)) add('ev_rag', b.id, i, `${i.titulo}: ${T}`, { ts });
    if (b.tipo === 'Edición' && notifPref('ev_asigna', user).on) { const P = audParse(T); (P.rows || []).forEach(r => { if (/^(Responsable|Dueño)$/.test(r[0]) && _nrm(r[2]) === u) add('ev_asigna', b.id + r[0], i, `${P.ent ? P.kind + ' «' + P.ent + '»' : i.titulo}: ahora eres ${r[0] === 'Dueño' ? 'dueño' : 'responsable'} (antes ${r[1]}) · ${i.titulo}`, { ts }); }); }
  });
  /* canales activos para cada aviso (hoy solo «app» se entrega; el resto queda en la cola de salida) */
  out.forEach(n => { const p = notifPref(n.tipo, user); n.canales = NOTIF_CANALES.filter(c => p.canales[c[0]] && (c[0] === 'app' || (St.cfg.notif || {}).canalOn && St.cfg.notif.canalOn[c[0]])).map(c => c[0]); });
  return out.sort((a, b) => (b.ts > a.ts ? 1 : b.ts < a.ts ? -1 : b.sev - a.sev));
}
const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
function usuarioSintetico(n) {   // persona sin fila en Usuarios: Colaborador con las áreas de lo que lidera
  const k = _nrm(n), ar = [...new Set(St.ini.filter(i => _nrm(i.lider) === k || _nrm(i.sponsor) === k).flatMap(i => areasDe(i.area)))];
  return { n, rol: 'Colaborador', cargo: '', area: ar.join(','), correo: '', veTodo: false, sint: true };
}
let PRES_MIO = false;
const cfgUOf = n => (St.cfgU || {})[_nrm(n)] || {};
function cfgOf(n) { return cfgUOf(n).cfg || {}; }
function cfgI(i, k) { const v = i && i.lider && !fijo(k) ? cfgOf(i.lider)[k] : null; return v != null && v !== '' ? v : St.cfg[k]; }
const fijo = k => !!((St.cfg.fijos || {})[k]);
const PERM_ROLES = ['Gasto', 'Administrador', 'Colaborador', 'Invitado'];
function usuarioActual() {
  const n = _nrm(miUsuario()), au = !FL.verComo && typeof AuthService !== 'undefined' && AuthService.user && AuthService.user(), em = _nrm(au && (au.email || au.username));
  return St.usuarios.find(u => _nrm(u.n) === n) || St.usuarios.find(u => em && _nrm(u.correo) === em) || (FL.verComo ? usuarioSintetico(FL.verComo) : null);
}
function rolActual() {
  if (!FL.verComo && esAdminReal()) return 'Gasto';
  const u = usuarioActual(); if (!u) return 'Invitado';                       // desconocido ⇒ solo lectura
  return PERM_ROLES.includes(u.rol) ? u.rol : 'Colaborador';
}
const areasDe = a => String(Array.isArray(a) ? a.join(',') : a || '').split(',').map(x => x.trim()).filter(Boolean);
const areasPropias = () => { const u = usuarioActual(); return u ? areasDe(u.area) : []; };
function puedeVerTodo() { const r = rolActual(), u = usuarioActual(); return r === 'Gasto' || r === 'Administrador' || !!(u && (u.veTodo === true || u.veTodo === 'TRUE')) || (!FL.verComo && esAdminReal()); }
const areaVisible = a => puedeVerTodo() || areasDe(a).includes('Transversal') || areasDe(a).some(x => areasPropias().includes(x));
  return { avisos: () => notifPara(usuario), NOTIF, NOTIF_CANALES, NOTIF_GRUPOS };
}
return { crearMotor, ORIGEN: "C2.28", FUNCIONES: ["MESES","MES3","pad","toISO","pD","diffD","fmtD","hoy","FASES_ACT","EST_FINAL","esProp","byId","audParse","isDone","esSB","isLive","isActive","ADMIN_USERS","miUsuario","respSel","ADMIN_EMAILS","_nrm","esAdminReal","_PP","personProjects","respOk","inArea","scopeP","DECS","CAMBIOS","ACUERDOS","_ixGen","_porIni","hitosDe","forecast","desv","atrasado","esperado","expo","riesgoAbierto","diasSinUpd","diasEnFase","NOTIF_CANALES","NOTIF_DEST","NOTIF_GRUPOS","NOTIF","NOTIF_VENT","rolDeUser","notifPref","notifPara","cut","usuarioSintetico","PRES_MIO","cfgUOf","cfgOf","cfgI","fijo","PERM_ROLES","usuarioActual","rolActual","areasDe","areasPropias","puedeVerTodo","areaVisible"] };
});
