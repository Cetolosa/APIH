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

  const VERSION = { v: 'C1.1', b: '15-10-2026', origen: 'V22.52' };

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
  const ESTADOS = { Propuesta: ['Vigente', 'En espera', 'Aprobada', 'Rechazada', 'Retirada'], Proyecto: ['En curso', 'Pausado', 'Completado', 'Cancelado'] };
  const EST_FINAL = ['Aprobada', 'Rechazada', 'Retirada', 'Completado', 'Cancelado'];
  const EST_MOTIVO = ['En espera', 'Pausado', 'Rechazada', 'Retirada', 'Cancelado'];
  const EST_REVISION = ['En espera', 'Pausado'];
  const RAGS = ['Verde', 'Ámbar', 'Rojo'], PRIOS = ['Alta', 'Media', 'Baja'], MONEDAS = ['CLP', 'USD', 'UF'];
  const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;
  const fechaOk = s => ES_FECHA.test(s) && toISO(pD(s)) === s;   // rechaza 2026-02-30

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

  const INICIATIVA = Object.freeze({ FASES, ESTADOS, EST_FINAL, EST_MOTIVO, EST_REVISION, RAGS, PRIOS, MONEDAS });

  return Object.freeze({ VERSION, pad, toISO, pD, addD, diffD, expo, nivelRiesgo, riesgoAbierto, INICIATIVA, hayCiclo, validarIniciativa, validarCambioEstado });
});
