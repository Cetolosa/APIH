/* C1.1 — Adaptador DataPort en memoria. Implementación de referencia del contrato de Iniciativa
 * (packages/core/contracts/iniciativa.md). Los adaptadores Supabase y Azure deben comportarse igual. */
'use strict';
const core = require('../../packages/core/apih-core.js');
const RO = ['id', 'version', 'creada', 'actualizada', 'modificadoPor', 'faseDesde', 'hist'];

function errorApi(codigo, mensaje, detalles) { const e = new Error(mensaje); e.codigo = codigo; if (detalles) e.detalles = detalles; return e; }

module.exports = function crearAdaptadorMemoria(opts) {
  opts = opts || {};
  const usuario = opts.usuario || 'prueba@aramark.cl', puedeEscribir = opts.puedeEscribir !== false, hoy = opts.hoy || (() => core.toISO(new Date()));
  const db = new Map(); let seq = { PROP: 0, PRJ: 0 }, rev = 0;
  const copia = x => JSON.parse(JSON.stringify(x));
  const grafo = () => Object.fromEntries([...db.values()].map(x => [x.id, x.deps || []]));
  const sellar = x => { x.version = String(++rev); x.actualizada = hoy(); x.modificadoPor = usuario; return x; };
  const permiso = () => { if (!puedeEscribir) throw errorApi('SIN_PERMISO', 'Rol sin escritura'); };
  const leer = id => { const x = db.get(id); if (!x) throw errorApi('NO_ENCONTRADA', 'No existe ' + id); return x; };
  const verificar = (x, version) => { if (x.version !== version) throw errorApi('CONFLICTO', 'Otro usuario modificó ' + x.id); };
  const validar = (x, ctx) => { const e = core.validarIniciativa(x, Object.assign({ grafo: grafo() }, ctx)); if (e.length) throw errorApi('INVALIDA', 'Datos inválidos', e); };
  const guardar = x => { db.set(x.id, x); return copia(x); };

  return {
    async listar(f) {
      f = f || {}; const t = (f.texto || '').toLowerCase();
      return [...db.values()].filter(x => (!f.tipo || x.tipo === f.tipo) && (!f.fase || x.fase === f.fase) && (!f.estado || x.estado === f.estado)
        && (!f.area || (x.area || []).includes(f.area)) && (!t || (x.titulo + ' ' + (x.desc || '')).toLowerCase().includes(t))).map(copia);
    },
    async obtener(id) { return copia(leer(id)); },
    async crear(datos) {
      permiso(); const x = copia(datos); RO.forEach(k => delete x[k]);
      const pre = x.tipo === 'Propuesta' ? 'PROP' : 'PRJ';
      x.area = x.area || ['BISE']; x.avance = x.avance || 0;
      validar(x, { nueva: true });
      x.id = pre + '-' + String(++seq[pre]).padStart(3, '0'); x.creada = x.faseDesde = hoy(); x.hist = [[hoy(), x.avance]];
      return guardar(sellar(x));
    },
    async actualizar(id, cambios, version) {
      permiso(); const a = leer(id); verificar(a, version);
      const c = copia(cambios); RO.forEach(k => delete c[k]);
      if ('tipo' in c && c.tipo !== a.tipo) throw errorApi('INVALIDA', 'tipo no cambia', [{ campo: 'tipo', regla: 'inmutable' }]);
      if ('estado' in c && c.estado !== a.estado) throw errorApi('INVALIDA', 'Use cambiarEstado', [{ campo: 'estado', regla: 'usar cambiarEstado' }]);
      if ('fase' in c && c.fase !== a.fase) throw errorApi('INVALIDA', 'Use cambiarFase', [{ campo: 'fase', regla: 'usar cambiarFase' }]);
      const n = Object.assign(copia(a), c); validar(n);
      if (n.avance !== a.avance) n.hist = [...(a.hist || []), [hoy(), n.avance]];
      return guardar(sellar(n));
    },
    async cambiarEstado(id, c, version) {
      permiso(); const a = leer(id); verificar(a, version);
      const e = core.validarCambioEstado(a, c); if (e.length) throw errorApi('INVALIDA', 'Cambio de estado inválido', e);
      const n = Object.assign(copia(a), { estado: c.estado, estadoMotivo: core.INICIATIVA.EST_MOTIVO.includes(c.estado) ? c.motivo : '', estadoRev: core.INICIATIVA.EST_REVISION.includes(c.estado) ? c.rev : null });
      if (c.estado === 'Completado') { n.finReal = hoy(); if (n.avance < 100) { n.avance = 100; n.hist = [...(n.hist || []), [hoy(), 100]]; } }
      return guardar(sellar(n));
    },
    async cambiarFase(id, fase, version) {
      permiso(); const a = leer(id); verificar(a, version);
      if (core.INICIATIVA.EST_FINAL.includes(a.estado)) throw errorApi('INVALIDA', 'Estado final', [{ campo: 'estado', regla: 'estado final' }]);
      const n = Object.assign(copia(a), { fase }); validar(n);
      if (fase !== a.fase) n.faseDesde = hoy();
      return guardar(sellar(n));   // compuertas: C1.2+ (dependen de hitos/riesgos)
    },
    async aprobarPropuesta(id, version) {
      permiso(); const p = leer(id); verificar(p, version);
      if (p.tipo !== 'Propuesta' || p.fase !== 'Aprobación' || core.INICIATIVA.EST_FINAL.includes(p.estado)) throw errorApi('COMPUERTA', 'No aprobable', [{ campo: 'fase', regla: 'Propuesta vigente en fase Aprobación' }]);
      const prj = copia(p); RO.forEach(k => delete prj[k]);
      Object.assign(prj, { tipo: 'Proyecto', fase: 'Planificación', estado: 'En curso', rag: 'Verde', avance: 0, propuestaOrigen: p.id, estadoMotivo: '', estadoRev: null, finEst: p.finPlan || null });
      validar(prj, { nueva: true });
      prj.id = 'PRJ-' + String(++seq.PRJ).padStart(3, '0'); prj.creada = prj.faseDesde = hoy(); prj.hist = [[hoy(), 0]];
      const proyecto = guardar(sellar(prj));
      const propuesta = guardar(sellar(Object.assign(copia(p), { estado: 'Aprobada' })));
      return { propuesta, proyecto };
    },
    async eliminar(id, version) {
      permiso(); const a = leer(id); verificar(a, version); db.delete(id);
      db.forEach(x => { if ((x.deps || []).includes(id)) x.deps = x.deps.filter(d => d !== id); });
    }
  };
};
