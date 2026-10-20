/* APIH Corporativo — packages/core
 * Reglas puras, sin DOM ni estado global. Script clásico: navegador (window.APIHCore) y Node (module.exports).
 * Versión del Corporativo (independiente de las V22.x del Prototipo).
 * Origen: index.html V22.52 (fechas l.854-858, riesgo l.1136-1138). Equivalencia: tests/unit/core-equivalencia.js
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.APIHCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = { v: 'C2.27', b: '20-10-2026', origen: 'V22.69' };

  /* ---------- fechas (ISO 'AAAA-MM-DD', hora local fija 12:00 para evitar saltos por horario de verano) ---------- */
  const pad = n => String(n).padStart(2, '0');
  const toISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const pD = s => { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const addD = (s, n) => { const d = pD(s); d.setDate(d.getDate() + n); return toISO(d); };
  const diffD = (a, b) => Math.round((pD(a) - pD(b)) / 864e5);   // a - b en días

  /* ---------- riesgo ---------- */
  const expo = r => r.prob * r.imp;
  // umbral: valor de 'umbralCritico' (en el Prototipo viene de cfgMi). Alto >= 10, Medio >= 5 son fijos.
  const nivelRiesgo = (e, umbral) => e >= umbral ? { n: 'Crítico', c: '#D13438' } : e >= 10 ? { n: 'Alto', c: '#CA5010' } : e >= 5 ? { n: 'Medio', c: '#F2A100' } : { n: 'Bajo', c: '#107C10' };
  const riesgoAbierto = r => r.estado !== 'Cerrado';

  /* ---------- iniciativa (C1.1) — contrato: contracts/iniciativa.md y .schema.json ---------- */
  const FASES = { Propuesta: ['Recepción', 'Evaluación', 'Caso de Negocio', 'Aprobación'], Proyecto: ['Planificación', 'Ejecución', 'Transición', 'Cierre'] };
  const ESTADOS = { Propuesta: ['Vigente', 'En espera', 'Stand By', 'Aprobada', 'Rechazada', 'Retirada'], Proyecto: ['En curso', 'Pausado', 'Stand By', 'Completado', 'Cancelado'] };
  const EST_FINAL = ['Aprobada', 'Rechazada', 'Retirada', 'Completado', 'Cancelado'];
  const EST_MOTIVO = ['En espera', 'Pausado', 'Stand By', 'Rechazada', 'Retirada', 'Cancelado'];
  const EST_REVISION = ['En espera', 'Pausado'];
  const RAGS = ['Verde', 'Ámbar', 'Rojo'], PRIOS = ['Alta', 'Media', 'Baja'], MONEDAS = ['CLP', 'USD', 'UF'];
  const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;
  const fechaOk = s => ES_FECHA.test(s) && +String(s).slice(0, 4) >= 1900 && +String(s).slice(0, 4) <= 2100 && toISO(pD(s)) === s;   // rechaza 2026-02-30 y años fuera de 1900–2100 (N-S-03)   // rechaza 2026-02-30

  // ¿Hay ciclo si `id` pasa a depender de `deps`? grafo: id -> deps[]
  function hayCiclo(id, deps, grafo) {
    const vis = new Set(), pila = [...(deps || [])];
    while (pila.length) { const x = pila.pop(); if (x === id) return true; if (vis.has(x)) continue; vis.add(x); pila.push(...((grafo && grafo[x]) || [])); }
    return false;
  }

  /* Devuelve [] si es válida, o [{ campo, regla }]. ctx: { nueva?: bool, grafo?: {id: deps[]} } */
  function validarIniciativa(i, ctx) {
    ctx = ctx || {}; const e = [], err = (campo, regla) => e.push({ campo, regla });
    if (!i || typeof i !== 'object') return [{ campo: '', regla: 'objeto requerido' }];
    const T = i.tipo;
    if (!FASES[T]) err('tipo', 'Propuesta o Proyecto');
    if (!i.titulo || !String(i.titulo).trim()) err('titulo', 'obligatorio');
    if (!i.lider || !String(i.lider).trim()) err('lider', 'obligatorio');
    if (FASES[T] && !FASES[T].includes(i.fase)) err('fase', 'fase de ' + T);
    if (ESTADOS[T] && !ESTADOS[T].includes(i.estado)) err('estado', 'estado de ' + T);
    if (i.rag != null && !RAGS.includes(i.rag)) err('rag', 'Verde, Ámbar o Rojo');
    if (i.prioridad != null && !PRIOS.includes(i.prioridad)) err('prioridad', 'Alta, Media o Baja');
    if (i.moneda != null && !MONEDAS.includes(i.moneda)) err('moneda', 'CLP, USD o UF');
    if (i.area != null && (!Array.isArray(i.area) || !i.area.length)) err('area', 'lista con al menos un área');
    ['avance', 'avanceFase'].forEach(k => { if (i[k] != null && !(typeof i[k] === 'number' && i[k] >= 0 && i[k] <= 100)) err(k, '0 a 100'); });
    if (i.faseNota != null) { if (typeof i.faseNota !== 'object' || Array.isArray(i.faseNota)) err('faseNota', 'objeto {fase: texto}'); else Object.entries(i.faseNota).forEach(([fx, v]) => { if (FASES[T] && !FASES[T].includes(fx)) err('faseNota.' + fx, 'fase de ' + T); if (typeof v !== 'string' || v.length > 500) err('faseNota.' + fx, 'texto de hasta 500 caracteres'); }); }
    ['presupuesto', 'gastado', 'beneficio', 'ahorroReal'].forEach(k => { if (i[k] != null && !(typeof i[k] === 'number' && i[k] >= 0)) err(k, 'número >= 0'); });
    ['inicioPlan', 'finPlan', 'finEst', 'inicioReal', 'finReal', 'estadoRev'].forEach(k => { if (i[k] != null && !fechaOk(i[k])) err(k, 'fecha AAAA-MM-DD válida'); });
    if (i.score != null) ['estrategia', 'valor', 'esfuerzo', 'riesgo'].forEach(k => { const v = i.score[k]; if (v != null && !(Number.isInteger(v) && v >= 1 && v <= 5)) err('score.' + k, 'entero 1 a 5'); });
    // reglas entre campos (contrato §Reglas)
    if (EST_MOTIVO.includes(i.estado) && !(i.estadoMotivo && String(i.estadoMotivo).trim())) err('estadoMotivo', 'obligatorio para ' + i.estado);
    if (EST_REVISION.includes(i.estado) && !i.estadoRev) err('estadoRev', 'obligatoria para ' + i.estado);
    if (i.estado === 'Completado' && i.fase !== 'Cierre') err('estado', 'Completado solo en fase Cierre');
    if (fechaOk(i.inicioPlan || '') && fechaOk(i.finPlan || '') && i.finPlan < i.inicioPlan) err('finPlan', 'no anterior a inicioPlan');
    if (fechaOk(i.inicioReal || '') && fechaOk(i.finReal || '') && i.finReal < i.inicioReal) err('finReal', 'no anterior a inicioReal');
    if (i.deps != null) {
      if (!Array.isArray(i.deps)) err('deps', 'lista');
      else { if (i.id && i.deps.includes(i.id)) err('deps', 'no puede depender de sí misma'); else if (i.id && hayCiclo(i.id, i.deps, ctx.grafo)) err('deps', 'genera un ciclo'); if (new Set(i.deps).size !== i.deps.length) err('deps', 'sin repetidos'); }
    }
    if (ctx.nueva && T === 'Proyecto' && !i.propuestaOrigen && (i.origen || 'usuario') === 'usuario' && !(i.motivoAlta && String(i.motivoAlta).trim())) err('motivoAlta', 'obligatorio en alta directa de Proyecto');
    if (ctx.nueva && i.estado === 'Aprobada') err('estado', 'Aprobada solo vía aprobarPropuesta');
    return e;
  }

  /* Cambio de estado (contrato: cambiarEstado). Devuelve [] o errores. */
  function validarCambioEstado(i, c) {
    const e = [];
    if (EST_FINAL.includes(i.estado)) e.push({ campo: 'estado', regla: 'estado final, no admite cambios' });
    if (c.estado === 'Aprobada') e.push({ campo: 'estado', regla: 'Aprobada solo vía aprobarPropuesta' });
    return e.length ? e : validarIniciativa(Object.assign({}, i, { estado: c.estado, estadoMotivo: c.motivo || '', estadoRev: c.rev || null }));
  }


  /* ---------- hitos, riesgos, compuertas y fases (C1.4) — copiados de index.html V22.54, dependencias por parámetro ---------- */
  const RISK_CATS = ['Técnico', 'Alcance', 'Recursos', 'Proveedor', 'Cronograma', 'Financiero', 'Regulatorio', 'Otro'];
  const RISK_ESTADOS = ['Abierto', 'En mitigación', 'Materializado', 'Cerrado'];
  const FASE_COLOR = { 'Recepción': '#8A8886', 'Evaluación': '#8764B8', 'Caso de Negocio': '#4F6BED', 'Aprobación': '#038387', 'Planificación': '#0D446A', 'Ejecución': '#107C10', 'Transición': '#CA5010', 'Cierre': '#605E5C' };
  const porFecha = (a, b) => ((a.fecha == null) - (b.fecha == null)) || (a.fecha > b.fecha ? 1 : a.fecha < b.fecha ? -1 : 0);
  const fasesDe = i => i && i.tipo === 'Propuesta' ? FASES.Propuesta : FASES.Proyecto;

  // Semáforo de un hito. hoy: 'AAAA-MM-DD'. (El texto «Vence …» del Prototipo usa rel(); aquí: «Vence en N d».)
  function hitoEstado(h, hoy) {
    if (h.completado) return (h.fechaReal && h.fechaReal > h.fecha) ? { k: 'late', t: 'Completado con retraso', c: '#F2A100' } : { k: 'done', t: 'Completado', c: '#107C10' };
    const d = diffD(h.fecha, hoy);
    if (d < 0) return { k: 'over', t: 'Vencido (' + (-d) + ' d)', c: '#D13438' };
    if (d <= 7) return { k: 'soon', t: d === 0 ? 'Vence hoy' : 'Vence en ' + d + ' d', c: '#F2A100' };
    return { k: 'ok', t: 'En plazo', c: '#0D446A' };
  }
  const riesgoSinMit = (r, umbral) => riesgoAbierto(r) && expo(r) >= umbral && !String(r.mit || '').trim();

  /* Compuertas de fase. ctx: { hitos: [...de la iniciativa], riesgos: [...], hoy, umbral } */
  function gates(i, to, ctx) {
    const g = [], ok = (c, t) => g.push({ ok: !!c, t });
    const hs = ctx.hitos || [], rs = ctx.riesgos || [], U = ctx.umbral, sinMit = r => riesgoSinMit(r, U);
    if (to === 'Evaluación') { ok(i.problema || i.desc, 'Problema/objetivo descrito'); ok(i.sponsor, 'Sponsor identificado'); }
    if (to === 'Caso de Negocio') { ok(i.sponsor, 'Sponsor identificado'); ok(i.score, 'Evaluación de valor/esfuerzo completada'); ok(i.lider, 'Líder asignado'); }
    if (to === 'Aprobación') { ok(i.presupuesto > 0, 'Presupuesto estimado'); ok(i.beneficio > 0 || i.categoria === 'Transversal', 'Beneficio esperado'); ok(i.bc, 'Business case redactado'); }
    if (to === 'Ejecución') { ok(i.inicioPlan && i.finPlan, 'Fechas plan definidas'); ok(i.presupuesto > 0 || i.categoria === 'Transversal', 'Presupuesto asignado'); ok(hs.length >= 2, 'Al menos 2 hitos planificados'); ok(!rs.some(sinMit), 'Riesgos críticos con plan de mitigación'); ok(i.lider, 'Líder asignado'); }
    if (to === 'Transición') { ok(i.avance >= 80, 'Avance ≥ 80%'); ok(!hs.some(h => !h.completado && h.fecha < ctx.hoy), 'Sin hitos vencidos'); ok(!rs.some(sinMit), 'Riesgos críticos con plan de mitigación'); }
    { const F_ = fasesDe(i), a = F_.indexOf(i.fase), b = F_.indexOf(to); if (b > a && a >= 0) { const pend = hs.filter(h => h.fase === i.fase && !h.completado); if (hs.some(h => h.fase === i.fase)) ok(!pend.length, 'Hitos de la fase ' + i.fase + ' completados' + (pend.length ? ' (faltan ' + pend.length + ')' : '')); } }
    if (to === 'Cierre') { ok(i.avance >= 100, 'Avance al 100%'); ok(hs.filter(h => h.fase !== to).every(h => h.completado), 'Todos los hitos completados'); ok(!rs.some(r => riesgoAbierto(r) && expo(r) >= U), 'Sin riesgos críticos abiertos'); }   /* F-06/F-07: los hitos de la propia fase Cierre no bloquean el cierre; «En mitigación» cuenta como abierto */
    return g;
  }

  /* Ventana de cada fase (V22.53): del día siguiente al fin de la anterior hasta su último hito */
  function fasesVentana(i, hitos) {
    const FS = fasesDe(i), hs = hitos || []; let prev = null;
    return FS.map((f, k) => {
      const h = hs.filter(x => x.fase === f).slice().sort(porFecha);
      let ini = k === 0 ? (i.inicioPlan || (i.tipo === 'Propuesta' && i.creada) || (h[0] && h[0].fecha) || null) : (prev ? addD(prev, 1) : ((h[0] && h[0].fecha) || null));
      let fin = h.length ? h[h.length - 1].fecha : (k === FS.length - 1 ? (i.finPlan || ini) : ini);
      if (ini && fin && fin < ini) fin = ini; if (!ini) ini = fin; if (fin) prev = fin;
      return { fase: f, k, ini, fin, hitos: h, subs: (Array.isArray(i.subfases) ? i.subfases : []).filter(s => s.fase === f).slice().sort((x, y) => x.inicio < y.inicio ? -1 : x.inicio > y.inicio ? 1 : 0), done: h.filter(x => x.completado).length, color: FASE_COLOR[f] || '#605E5C', actual: i.fase === f, pasada: FS.indexOf(i.fase) > k };
    });
  }

  function validarHito(h) {
    const e = [], err = (campo, regla) => e.push({ campo, regla });
    if (!h || typeof h !== 'object') return [{ campo: '', regla: 'objeto requerido' }];
    if (!h.ini) err('ini', 'obligatorio');
    if (!h.nombre || !String(h.nombre).trim()) err('nombre', 'obligatorio');
    if (!h.fecha || !fechaOk(h.fecha)) err('fecha', 'fecha AAAA-MM-DD válida');
    if (h.fase && !FASES.Propuesta.concat(FASES.Proyecto).includes(h.fase)) err('fase', 'fase válida o vacía');
    if (h.fechaReal != null && h.fechaReal !== '' && !fechaOk(h.fechaReal)) err('fechaReal', 'fecha AAAA-MM-DD válida');
    if (h.completado && !h.fechaReal) err('fechaReal', 'obligatoria si está completado');
    if (h.cat != null && h.cat !== '' && !HITO_CATS.includes(h.cat)) err('cat', 'categoría de hito válida o vacía');
    if (h.subfase != null && h.subfase !== '' && (typeof h.subfase !== 'string' || !/^(PROP|PRJ|PRO)-\d+-SF\d+$/.test(h.subfase))) err('subfase', 'id de subfase (<iniciativa>-SF<n>)');
    if (h.desc != null && (typeof h.desc !== 'string' || h.desc.length > 500)) err('desc', 'texto de hasta 500 caracteres');
    if (h.peso != null && !(typeof h.peso === 'number' && h.peso >= 0 && h.peso <= 100)) err('peso', 'número de 0 a 100 (peso en el reporte, opcional)');
    return e;
  }
  function validarRiesgo(r, umbral) {
    const e = [], err = (campo, regla) => e.push({ campo, regla });
    if (!r || typeof r !== 'object') return [{ campo: '', regla: 'objeto requerido' }];
    if (!r.ini) err('ini', 'obligatorio');
    if (!r.desc || !String(r.desc).trim()) err('desc', 'obligatorio');
    ['prob', 'imp'].forEach(k => { if (!(Number.isInteger(r[k]) && r[k] >= 1 && r[k] <= 5)) err(k, 'entero 1 a 5'); });
    if (r.cat != null && !RISK_CATS.includes(r.cat)) err('cat', 'categoría válida');
    if (!RISK_ESTADOS.includes(r.estado)) err('estado', 'estado válido');
    ['fIdent', 'fRev'].forEach(k => { if (r[k] != null && r[k] !== '' && !fechaOk(r[k])) err(k, 'fecha AAAA-MM-DD válida'); });
    if (umbral != null && riesgoSinMit(r, umbral)) err('mit', 'un riesgo crítico requiere plan de mitigación');
    return e;
  }

  const INICIATIVA = Object.freeze({ FASES, ESTADOS, EST_FINAL, EST_MOTIVO, EST_REVISION, RAGS, PRIOS, MONEDAS });

  const RIESGO = Object.freeze({ RISK_CATS, RISK_ESTADOS });
  /* C2.11 (V22.56) · categorías de hito */
  const HITO_CATS = ['Entregable', 'Gobierno', 'Técnico', 'Proveedor', 'Pago', 'Comunicación', 'Otro'];
  const HITO = Object.freeze({ HITO_CATS });
  /* C2.11 (V22.55, ADR-012) · subfases: una sola fase obligatoria, nacen con fechas y no salen de la ventana de su fase */
  /* opts.revisar: Set de ids cuya ventana se verifica (las nuevas o modificadas); sin opts se verifican todas */
  function validarSubfases(i, hitos, opts) {
    const e = [], err = (campo, regla) => e.push({ campo, regla }), subs = (i && i.subfases) || [];
    if (!Array.isArray(subs)) return [{ campo: 'subfases', regla: 'lista' }];
    if (subs.length > 60) return [{ campo: 'subfases', regla: 'máximo 60 por iniciativa' }];
    const V = fasesVentana(i, hitos || []), FS = fasesDe(i), ids = new Set();
    subs.forEach((s, k) => { const c = 'subfases[' + k + ']';
      if (!s || typeof s !== 'object') return err(c, 'objeto requerido');
      if (typeof s.id !== 'string' || !/^(PROP|PRJ|PRO)-\d+-SF\d+$/.test(s.id) || ids.has(s.id)) err(c + '.id', 'obligatorio, único, <iniciativa>-SF<n>'); ids.add(s.id);
      if (typeof s.nombre !== 'string' || !s.nombre.trim() || s.nombre.length > 120) err(c + '.nombre', 'texto obligatorio de hasta 120 caracteres');
      if (s.resp != null && (typeof s.resp !== 'string' || s.resp.length > 120)) err(c + '.resp', 'texto de hasta 120 caracteres');
      if (s.desc != null && (typeof s.desc !== 'string' || s.desc.length > 500)) err(c + '.desc', 'texto de hasta 500 caracteres');
      const extra = Object.keys(s).filter(k => !['id', 'nombre', 'fase', 'inicio', 'fin', 'resp', 'desc'].includes(k)); if (extra.length) err(c, 'campos no permitidos: ' + extra.join(', '));
      if (!FS.includes(s.fase)) return err(c + '.fase', 'una fase de ' + i.tipo);
      if (!fechaOk(s.inicio) || !fechaOk(s.fin)) return err(c + '.fechas', 'inicio y fin AAAA-MM-DD (nace con las fechas de su fase)');
      if (s.fin < s.inicio) return err(c + '.fin', 'no anterior al inicio');
      if (opts && opts.revisar && !opts.revisar.has(s.id)) return;
      const v = V.find(x => x.fase === s.fase); if (!v || !v.ini || !v.fin || s.inicio < v.ini || s.fin > v.fin) err(c, 'dentro de la fase ' + s.fase + (v && v.ini ? ' (' + v.ini + ' a ' + v.fin + ')' : ''));
    });
    return e;
  }
  /* El hito con subfase debe estar en la misma fase que ella */
  function validarHitoSubfase(h, i) {
    if (!h || !h.subfase) return []; const s = ((i && i.subfases) || []).find(x => x.id === h.subfase);
    if (!s) return [{ campo: 'subfase', regla: 'subfase de la misma iniciativa' }];
    return h.fase && h.fase !== s.fase ? [{ campo: 'subfase', regla: 'misma fase que la subfase (' + s.fase + ')' }] : [];
  }
  return Object.freeze({ VERSION, pad, toISO, pD, addD, diffD, expo, nivelRiesgo, riesgoAbierto, INICIATIVA, RIESGO, FASE_COLOR, fasesDe, hayCiclo, validarIniciativa, validarCambioEstado, hitoEstado, riesgoSinMit, gates, fasesVentana, validarHito, validarRiesgo, HITO, validarSubfases, validarHitoSubfase });
});
