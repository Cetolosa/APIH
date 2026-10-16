/* C2.0 — Fábricas de DataPort para las pruebas de contrato.
 *  servicio: llama directo al servicio de negocio (services/api) con store en memoria.
 *  http:     pasa por el enrutador HTTP (rutas REST, If-Match, códigos de estado, autenticación de Static Web Apps). */
'use strict';
const crearServicio = require('../../services/api/src/servicio');
const crearStoreMemoria = require('../../services/api/src/store-memoria');
const crearApp = require('../../services/api/src/app');
const HOY = '2026-10-16';
const usuario = o => ({ email: 'prueba@aramark.cl', nombre: 'Prueba', rol: o && o.puedeEscribir === false ? 'Lectura' : 'Editor' });
const OPS = ['listar', 'obtener', 'crear', 'actualizar', 'cambiarEstado', 'cambiarFase', 'aprobarPropuesta', 'eliminar', 'compuerta', 'fases', 'listarHitos', 'crearHito', 'actualizarHito', 'completarHito', 'eliminarHito', 'listarRiesgos', 'crearRiesgo', 'actualizarRiesgo', 'eliminarRiesgo', 'listarRegistros', 'guardarRegistro', 'eliminarRegistro', 'sello'];

function servicio(o, store) {
  const s = crearServicio({ store: store || crearStoreMemoria(), hoy: () => HOY, config: { umbralCritico: 15 } }), u = usuario(o);
  return Object.fromEntries(OPS.map(k => [k, (...a) => s[k](u, ...a)]));
}

function http(o, store) {
  const s = crearServicio({ store: store || crearStoreMemoria(), hoy: () => HOY, config: { umbralCritico: 15 } });
  const handle = crearApp({ servicio: s, env: {} }), u = usuario(o);
  const principal = Buffer.from(JSON.stringify({ identityProvider: 'aad', userDetails: u.email, userRoles: ['authenticated', u.rol === 'Editor' ? 'apih-editor' : 'apih-lectura'] })).toString('base64');
  const call = async (method, path, body, version, query) => {
    const r = await handle({ method, path, query: query || {}, body, headers: Object.assign({ 'x-ms-client-principal': principal }, version != null ? { 'If-Match': '"' + version + '"' } : {}) });
    const j = r.body ? JSON.parse(r.body) : undefined;
    if (r.status >= 400) { const e = new Error(j.mensaje); e.codigo = j.codigo; e.detalles = j.detalles; e.status = r.status; throw e; }
    if (j && j.version && r.headers.etag !== '"' + j.version + '"') throw new Error('ETag no coincide con version');
    return j;
  };
  return {
    listar: f => call('GET', '/api/iniciativas', null, null, f || {}), obtener: id => call('GET', '/api/iniciativas/' + id),
    crear: d => call('POST', '/api/iniciativas', d), actualizar: (id, c, v) => call('PATCH', '/api/iniciativas/' + id, c, v),
    cambiarEstado: (id, c, v) => call('POST', '/api/iniciativas/' + id + '/estado', c, v), cambiarFase: (id, f, v) => call('POST', '/api/iniciativas/' + id + '/fase', { fase: f }, v),
    aprobarPropuesta: (id, v) => call('POST', '/api/iniciativas/' + id + '/aprobar', {}, v), eliminar: (id, v) => call('DELETE', '/api/iniciativas/' + id, null, v),
    compuerta: (id, f) => call('GET', '/api/iniciativas/' + id + '/compuerta', null, null, f ? { fase: f } : {}), fases: id => call('GET', '/api/iniciativas/' + id + '/fases'),
    listarHitos: id => call('GET', '/api/iniciativas/' + id + '/hitos'), crearHito: (id, d) => call('POST', '/api/iniciativas/' + id + '/hitos', d),
    actualizarHito: (id, c, v) => call('PATCH', '/api/hitos/' + id, c, v), completarHito: (id, f, v) => call('POST', '/api/hitos/' + id + '/completar', f ? { fechaReal: f } : {}, v), eliminarHito: (id, v) => call('DELETE', '/api/hitos/' + id, null, v),
    listarRiesgos: id => call('GET', '/api/iniciativas/' + id + '/riesgos'), crearRiesgo: (id, d) => call('POST', '/api/iniciativas/' + id + '/riesgos', d),
    actualizarRiesgo: (id, c, v) => call('PATCH', '/api/riesgos/' + id, c, v), eliminarRiesgo: (id, v) => call('DELETE', '/api/riesgos/' + id, null, v),
    listarRegistros: l => call('GET', '/api/registros/' + l), guardarRegistro: (l, id, datos, v) => call('PUT', '/api/registros/' + l + '/' + encodeURIComponent(id), { datos }, v),
    eliminarRegistro: (l, id, v) => call('DELETE', '/api/registros/' + l + '/' + encodeURIComponent(id), null, v), sello: () => call('GET', '/api/sello'),
    _handle: handle
  };
}
const { crearStoreSql } = require('../../services/api/src/store-mssql');
const crearEjecutorSimulado = require('./sql-simulado');
const sqlSimulado = o => http(o, crearStoreSql(crearEjecutorSimulado()));
module.exports = { servicio, http, sqlSimulado, HOY };
