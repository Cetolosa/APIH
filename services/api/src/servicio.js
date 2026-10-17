'use strict';
/* C2.0 — Servicio de negocio de APIH Corporativo. Aplica TODAS las reglas del contrato en el servidor
 * (packages/core/contracts/iniciativa.md y hitos-riesgos.md) sobre un store intercambiable (memoria / Azure SQL).
 * usuario: { email, nombre, rol: 'Admin' | 'Editor' | 'Lectura' } — lo entrega la capa de autenticación (Entra ID). */
const core = require('./core');
const { errorApi } = require('./errores');

const RO_INI = ['id', 'version', 'creada', 'actualizada', 'modificadoPor', 'faseDesde', 'hist'];
const RO_SUB = ['id', 'version', 'modificadoPor', 'actualizada'];
const copia = x => JSON.parse(JSON.stringify(x));
const quitar = (x, ks) => { const c = copia(x || {}); ks.forEach(k => delete c[k]); return c; };

module.exports = function crearServicio({ store, hoy = () => core.toISO(new Date()), config = {} }) {
  const umbral = () => +config.umbralCritico || 15;
  const escribe = u => { if (!u || !['Admin', 'Editor'].includes(u.rol)) throw errorApi('SIN_PERMISO', 'Tu rol no permite modificar datos'); };
  const lee = u => { if (!u || !['Admin', 'Editor', 'Lectura'].includes(u.rol)) throw errorApi('SIN_PERMISO', 'Sin acceso a APIH'); };
  const sello = (x, u) => Object.assign(x, { actualizada: hoy(), modificadoPor: u.email });
  const leerIni = async (s, id) => { const x = await s.obtener('iniciativas', id); if (!x) throw errorApi('NO_ENCONTRADA', 'No existe ' + id); return x; };
  const leerSub = async (s, col, id) => { const x = await s.obtener(col, id); if (!x) throw errorApi('NO_ENCONTRADA', 'No existe ' + id); return x; };
  const grafo = async s => Object.fromEntries((await s.listar('iniciativas')).map(x => [x.id, x.deps || []]));
  const validarIni = async (s, x, ctx) => { const e = core.validarIniciativa(x, Object.assign({ grafo: await grafo(s) }, ctx)); if (Array.isArray(x.subfases) && x.subfases.length) e.push(...core.validarSubfases(x, await s.listar('hitos', h => h.ini === x.id))); if (e.length) throw errorApi('INVALIDA', 'Datos inválidos', e); };
  const ctxGates = async (s, id) => ({ hitos: await s.listar('hitos', h => h.ini === id), riesgos: await s.listar('riesgos', r => r.ini === id), hoy: hoy(), umbral: umbral() });
  const verificarVersion = (x, version) => { if (version == null || x.version !== String(version)) throw errorApi('CONFLICTO', 'Otro usuario modificó ' + x.id + ' (versión ' + x.version + ')'); };
  const EST = core.INICIATIVA;
  const listaOk = l => { if (!/^[A-Za-z0-9_]{1,60}$/.test(l || '')) throw errorApi('INVALIDA', 'Lista inválida', [{ campo: 'lista', regla: 'A-Z, 0-9, _' }]); };

  const api = {
    /* ---------- Iniciativas ---------- */
    async listar(u, f = {}) {
      lee(u); const t = (f.texto || '').toLowerCase();
      return store.listar('iniciativas', x => (!f.tipo || x.tipo === f.tipo) && (!f.fase || x.fase === f.fase) && (!f.estado || x.estado === f.estado)
        && (!f.area || (x.area || []).includes(f.area)) && (!t || (x.titulo + ' ' + (x.desc || '')).toLowerCase().includes(t)));
    },
    async obtener(u, id) { lee(u); return leerIni(store, id); },
    /* opts.migracion (solo Admin): carga del historial del Prototipo. Conserva creada, faseDesde, hist y actualizada,
       y valida el registro como existente (no como alta nueva): un proyecto antiguo o una propuesta ya aprobada se aceptan tal cual. */
    async crear(u, datos, opts = {}) {
      escribe(u); const mig = !!opts.migracion;
      if (mig && u.rol !== 'Admin') throw errorApi('SIN_PERMISO', 'Solo Admin puede migrar historial');
      return store.tx(async s => {
        const x = quitar(datos, RO_INI); x.area = x.area || ['BISE']; x.avance = x.avance || 0; x.origen = x.origen || 'usuario';
        const pre = x.tipo === 'Propuesta' ? 'PROP' : 'PRJ';
        if (datos && datos.id != null) { if (!new RegExp('^' + pre + '-\\d+$').test(datos.id)) throw errorApi('INVALIDA', 'Id inválido', [{ campo: 'id', regla: pre + '-n' }]); x.id = datos.id; }
        await validarIni(s, x, mig ? {} : { nueva: true });
        if (x.propuestaOrigen && !mig) { const p = await s.obtener('iniciativas', x.propuestaOrigen); if (!p || p.tipo !== 'Propuesta' || p.fase !== 'Aprobación' || EST.EST_FINAL.includes(p.estado)) throw errorApi('COMPUERTA', 'La propuesta de origen no está aprobable', [{ campo: 'propuestaOrigen', regla: 'Propuesta vigente en fase Aprobación' }]); }
        if (mig) {
          const fecha = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
          x.creada = fecha(datos.creada) || hoy(); x.faseDesde = fecha(datos.faseDesde) || x.creada;
          x.hist = Array.isArray(datos.hist) && datos.hist.length ? datos.hist.filter(h => Array.isArray(h) && fecha(h[0])) : [[x.creada, x.avance]];
          const r = sello(x, u); r.actualizada = fecha(datos.actualizada) || r.actualizada; r.origenMigracion = 'prototipo';
          return s.insertar('iniciativas', r, pre);
        }
        x.creada = x.faseDesde = hoy(); x.hist = [[hoy(), x.avance]];
        return s.insertar('iniciativas', sello(x, u), pre);
      });
    },
    async actualizar(u, id, cambios, version) {
      escribe(u);
      return store.tx(async s => {
        const a = await leerIni(s, id); verificarVersion(a, version);
        const c = quitar(cambios, RO_INI);
        if ('tipo' in c && c.tipo !== a.tipo) throw errorApi('INVALIDA', 'El tipo no cambia', [{ campo: 'tipo', regla: 'inmutable' }]);
        if ('estado' in c && c.estado !== a.estado) throw errorApi('INVALIDA', 'Use cambiarEstado', [{ campo: 'estado', regla: 'usar cambiarEstado' }]);
        if ('fase' in c && c.fase !== a.fase) throw errorApi('INVALIDA', 'Use cambiarFase', [{ campo: 'fase', regla: 'usar cambiarFase' }]);
        const n = Object.assign(copia(a), c); await validarIni(s, n);
        if (n.avance !== a.avance) n.hist = [...(a.hist || []), [hoy(), n.avance]];
        return s.actualizar('iniciativas', sello(n, u), version);
      });
    },
    async cambiarEstado(u, id, c, version) {
      escribe(u);
      return store.tx(async s => {
        const a = await leerIni(s, id); verificarVersion(a, version);
        /* Compatibilidad con la SPA (C2.2): «Aprobada» se acepta si ya existe el proyecto creado desde esta propuesta */
        const viaProyecto = c && c.estado === 'Aprobada' && a.tipo === 'Propuesta' && !EST.EST_FINAL.includes(a.estado) && (await s.listar('iniciativas', y => y.propuestaOrigen === a.id)).length > 0;
        const e = viaProyecto ? [] : core.validarCambioEstado(a, c || {}); if (e.length) throw errorApi('INVALIDA', 'Cambio de estado inválido', e);
        const n = Object.assign(copia(a), { estado: c.estado, estadoMotivo: EST.EST_MOTIVO.includes(c.estado) ? c.motivo : '', estadoRev: EST.EST_REVISION.includes(c.estado) ? c.rev : null });
        if (c.estado === 'Completado') { n.finReal = hoy(); if (n.avance < 100) { n.avance = 100; n.hist = [...(n.hist || []), [hoy(), 100]]; } }
        return s.actualizar('iniciativas', sello(n, u), version);
      });
    },
    /* Avance de UNA fase con compuertas (gates) o retroceso a cualquier fase anterior. */
    async cambiarFase(u, id, fase, version) {
      escribe(u);
      return store.tx(async s => {
        const a = await leerIni(s, id); verificarVersion(a, version);
        if (EST.EST_FINAL.includes(a.estado)) throw errorApi('INVALIDA', 'Estado final', [{ campo: 'estado', regla: 'estado final' }]);
        const FS = core.fasesDe(a), ia = FS.indexOf(a.fase), ib = FS.indexOf(fase);
        if (ib < 0) throw errorApi('INVALIDA', 'Fase no válida para ' + a.tipo, [{ campo: 'fase', regla: 'fase de ' + a.tipo }]);
        if (ib > ia + 1) throw errorApi('INVALIDA', 'Solo se avanza una fase a la vez', [{ campo: 'fase', regla: 'siguiente: ' + FS[ia + 1] }]);
        if (ib === ia + 1) { const g = core.gates(a, fase, await ctxGates(s, id)), no = g.filter(x => !x.ok); if (no.length) throw errorApi('COMPUERTA', 'Compuerta hacia ' + fase + ' no cumplida', no.map(x => ({ campo: 'fase', regla: x.t }))); }
        const n = Object.assign(copia(a), { fase }); if (fase !== a.fase) n.faseDesde = hoy();
        return s.actualizar('iniciativas', sello(n, u), version);
      });
    },
    async aprobarPropuesta(u, id, version) {
      escribe(u);
      return store.tx(async s => {
        const p = await leerIni(s, id); verificarVersion(p, version);
        if (p.tipo !== 'Propuesta' || p.fase !== 'Aprobación' || EST.EST_FINAL.includes(p.estado)) throw errorApi('COMPUERTA', 'No aprobable', [{ campo: 'fase', regla: 'Propuesta vigente en fase Aprobación' }]);
        const prj = quitar(p, RO_INI);
        Object.assign(prj, { tipo: 'Proyecto', fase: 'Planificación', estado: 'En curso', rag: 'Verde', avance: 0, propuestaOrigen: p.id, estadoMotivo: '', estadoRev: null, finEst: p.finPlan || null });
        await validarIni(s, prj, { nueva: true });
        prj.creada = prj.faseDesde = hoy(); prj.hist = [[hoy(), 0]];
        const proyecto = await s.insertar('iniciativas', sello(prj, u), 'PRJ');
        for (const col of ['hitos', 'riesgos']) for (const x of await s.listar(col, y => y.ini === p.id)) await s.actualizar(col, sello(Object.assign(x, { ini: proyecto.id }), u), x.version);
        const propuesta = await s.actualizar('iniciativas', sello(Object.assign(copia(p), { estado: 'Aprobada' }), u), version);
        return { propuesta, proyecto };
      });
    },
    async eliminar(u, id, version) {
      escribe(u);
      return store.tx(async s => {
        const a = await leerIni(s, id); verificarVersion(a, version);
        for (const col of ['hitos', 'riesgos']) for (const x of await s.listar(col, y => y.ini === id)) await s.eliminar(col, x.id);
        await s.eliminar('iniciativas', id, version);
        for (const x of await s.listar('iniciativas', y => (y.deps || []).includes(id))) await s.actualizar('iniciativas', Object.assign(x, { deps: x.deps.filter(d => d !== id) }), x.version);
      });
    },
    async compuerta(u, id, fase) { lee(u); const a = await leerIni(store, id); const FS = core.fasesDe(a); fase = fase || FS[FS.indexOf(a.fase) + 1]; return { fase: fase || null, condiciones: fase ? core.gates(a, fase, await ctxGates(store, id)) : [] }; },
    async fases(u, id) { lee(u); const a = await leerIni(store, id); return core.fasesVentana(a, await store.listar('hitos', h => h.ini === id)).map(v => Object.assign(v, { hitos: v.hitos.map(h => h.id) })); },

    /* ---------- Hitos ---------- */
    async listarHitos(u, ini) { lee(u); await leerIni(store, ini); return (await store.listar('hitos', h => h.ini === ini)).map(h => Object.assign(h, { semaforo: core.hitoEstado(h, hoy()) })); },
    async crearHito(u, ini, datos) {
      escribe(u);
      return store.tx(async s => { await leerIni(s, ini); const h = Object.assign(quitar(datos, RO_SUB), { ini }); if (datos && datos.id != null) { if (!/^HIT-\d+$/.test(datos.id)) throw errorApi('INVALIDA', 'Id inválido', [{ campo: 'id', regla: 'HIT-n' }]); h.id = datos.id; } h.completado = !!h.completado; if (h.completado && !h.fechaReal) h.fechaReal = hoy(); if (!h.completado) h.fechaReal = null;
        const e = core.validarHito(h).concat(core.validarHitoSubfase(h, await leerIni(s, ini))); if (e.length) throw errorApi('INVALIDA', 'Hito inválido', e); return s.insertar('hitos', sello(h, u), 'HIT'); });
    },
    async actualizarHito(u, id, cambios, version) {
      escribe(u);
      return store.tx(async s => { const a = await leerSub(s, 'hitos', id); verificarVersion(a, version); const c = quitar(cambios, RO_SUB); if (c.ini && c.ini !== a.ini) await leerIni(s, c.ini);
        const h = Object.assign(copia(a), c); h.completado = !!h.completado; if (h.completado && !h.fechaReal) h.fechaReal = hoy(); if (!h.completado) h.fechaReal = null;
        const e = core.validarHito(h).concat(core.validarHitoSubfase(h, await leerIni(s, h.ini))); if (e.length) throw errorApi('INVALIDA', 'Hito inválido', e); return s.actualizar('hitos', sello(h, u), version); });
    },
    async completarHito(u, id, fechaReal, version) { return api.actualizarHito(u, id, { completado: true, fechaReal: fechaReal || hoy() }, version); },
    async eliminarHito(u, id, version) { escribe(u); return store.tx(async s => { const a = await leerSub(s, 'hitos', id); verificarVersion(a, version); await s.eliminar('hitos', id, version); }); },

    /* ---------- Riesgos ---------- */
    async listarRiesgos(u, ini) { lee(u); await leerIni(store, ini); return (await store.listar('riesgos', r => r.ini === ini)).map(r => Object.assign(r, { exposicion: core.expo(r), nivel: core.nivelRiesgo(core.expo(r), umbral()).n })); },
    async crearRiesgo(u, ini, datos) {
      escribe(u);
      return store.tx(async s => { await leerIni(s, ini); const r = Object.assign({ cat: 'Técnico', estado: 'Abierto', fIdent: hoy(), fRev: core.addD(hoy(), 30), mit: '', dueno: u.nombre || u.email }, quitar(datos, RO_SUB), { ini }); if (datos && datos.id != null) { if (!/^RSK-\d+$/.test(datos.id)) throw errorApi('INVALIDA', 'Id inválido', [{ campo: 'id', regla: 'RSK-n' }]); r.id = datos.id; }
        const e = core.validarRiesgo(r, umbral()); if (e.length) throw errorApi('INVALIDA', 'Riesgo inválido', e); return s.insertar('riesgos', sello(r, u), 'RSK'); });
    },
    async actualizarRiesgo(u, id, cambios, version) {
      escribe(u);
      return store.tx(async s => { const a = await leerSub(s, 'riesgos', id); verificarVersion(a, version); const c = quitar(cambios, RO_SUB); if (c.ini && c.ini !== a.ini) await leerIni(s, c.ini); const r = Object.assign(copia(a), c);
        const e = core.validarRiesgo(r, umbral()); if (e.length) throw errorApi('INVALIDA', 'Riesgo inválido', e); return s.actualizar('riesgos', sello(r, u), version); });
    },
    async todosHitos(u) { lee(u); return store.listar('hitos'); },
    async todosRiesgos(u) { lee(u); return store.listar('riesgos'); },
    /* ---------- Notificaciones (C2.8): mismas reglas que la campana de la SPA ---------- */
    async misNotificaciones(u) { lee(u); const N = require('./notificaciones'), d = await N.cargarDatos(store); return N.avisosDe(d, N.personaDe(d, u), hoy()); },
    async despacharNotificaciones(u, { canales = {}, simular = true } = {}) {
      if (u && u.rol !== 'Admin') throw errorApi('SIN_PERMISO', 'Solo Admin ejecuta el envío de notificaciones');
      return require('./notificaciones').despachar({ store, hoy: hoy(), canales, simular });
    },
    async sello(u) { lee(u); return { sello: store.sello ? await store.sello() : String(Date.now()) }; },

    /* ---------- Registros genéricos (C2.2): resto de colecciones de la SPA mientras no tengan contrato propio ----------
     * Decisiones, bitácora, comités, compromisos, cambios, notas, documentos y parámetros. Texto opaco; solo acceso por rol.
     * APIH_Roles (usuarios y permisos de la interfaz) solo lo escribe Admin. */
    async listarRegistros(u, lista) { lee(u); listaOk(lista); return (await store.listar('reg:' + lista)).map(x => ({ id: x.id, datos: x.datos, version: x.version })); },
    async guardarRegistro(u, lista, id, datos, version) {
      escribe(u); listaOk(lista); if (/^APIH_Roles$/i.test(lista) && u.rol !== 'Admin') throw errorApi('SIN_PERMISO', 'Solo Admin modifica roles');
      if (!id || String(id).length > 100) throw errorApi('INVALIDA', 'Id inválido', [{ campo: 'id', regla: '1 a 100 caracteres' }]);
      if (typeof datos !== 'string') throw errorApi('INVALIDA', 'datos debe ser texto', [{ campo: 'datos', regla: 'texto' }]);
      const col = 'reg:' + lista, x = { id: String(id), datos, modificadoPor: u.email, actualizada: hoy() };
      const r = version == null ? await store.insertar(col, x) : await store.actualizar(col, x, version);
      return { id: r.id, version: r.version };
    },
    async eliminarRegistro(u, lista, id, version) { escribe(u); listaOk(lista); if (/^APIH_Roles$/i.test(lista) && u.rol !== 'Admin') throw errorApi('SIN_PERMISO', 'Solo Admin modifica roles'); await store.eliminar('reg:' + lista, String(id), version); },

    async eliminarRiesgo(u, id, version) { escribe(u); return store.tx(async s => { const a = await leerSub(s, 'riesgos', id); verificarVersion(a, version); await s.eliminar('riesgos', id, version); }); }
  };
  return api;
};
