'use strict';
/* C2.0 — Enrutador HTTP independiente del hosting. Lo usan functions/ (Azure Functions) y server.js (local).
 * req: { method, path, query, headers, body } → { status, headers, body } */
const { HTTP } = require('./errores');
const { usuarioDe } = require('./auth');
const core = require('../../../packages/core/apih-core.js');

module.exports = function crearApp({ servicio, env = process.env }) {
  const R = [];   // [método, patrón, handler(u, params, req)]
  const ruta = (m, p, h) => R.push([m, new RegExp('^' + p.replace(/\{(\w+)\}/g, '(?<$1>[^/]+)') + '/?$'), h]);
  const ver = req => { const v = req.headers['if-match'] || (req.body && req.body.version); return v == null ? null : String(v).replace(/^W\//, '').replace(/"/g, ''); };
  const b = req => req.body || {};
  ruta('GET', '/api/salud', async () => ({ ok: true, core: core.VERSION.v }));
  ruta('GET', '/api/yo', async u => u);
  ruta('GET', '/api/sello', u => servicio.sello(u));
  ruta('GET', '/api/hitos', u => servicio.todosHitos(u));
  ruta('GET', '/api/riesgos', u => servicio.todosRiesgos(u));
  ruta('GET', '/api/registros/{lista}', (u, p) => servicio.listarRegistros(u, p.lista));
  ruta('PUT', '/api/registros/{lista}/{id}', (u, p, req) => servicio.guardarRegistro(u, p.lista, decodeURIComponent(p.id), b(req).datos, ver(req)));
  ruta('DELETE', '/api/registros/{lista}/{id}', (u, p, req) => servicio.eliminarRegistro(u, p.lista, decodeURIComponent(p.id), ver(req)));
  ruta('GET', '/api/iniciativas', (u, p, req) => servicio.listar(u, req.query));
  ruta('POST', '/api/iniciativas', (u, p, req) => servicio.crear(u, b(req)));
  ruta('GET', '/api/iniciativas/{id}', (u, p) => servicio.obtener(u, p.id));
  ruta('PATCH', '/api/iniciativas/{id}', (u, p, req) => servicio.actualizar(u, p.id, b(req), ver(req)));
  ruta('DELETE', '/api/iniciativas/{id}', (u, p, req) => servicio.eliminar(u, p.id, ver(req)));
  ruta('POST', '/api/iniciativas/{id}/estado', (u, p, req) => servicio.cambiarEstado(u, p.id, b(req), ver(req)));
  ruta('POST', '/api/iniciativas/{id}/fase', (u, p, req) => servicio.cambiarFase(u, p.id, b(req).fase, ver(req)));
  ruta('POST', '/api/iniciativas/{id}/aprobar', (u, p, req) => servicio.aprobarPropuesta(u, p.id, ver(req)));
  ruta('GET', '/api/iniciativas/{id}/compuerta', (u, p, req) => servicio.compuerta(u, p.id, req.query.fase));
  ruta('GET', '/api/iniciativas/{id}/fases', (u, p) => servicio.fases(u, p.id));
  ruta('GET', '/api/iniciativas/{id}/hitos', (u, p) => servicio.listarHitos(u, p.id));
  ruta('POST', '/api/iniciativas/{id}/hitos', (u, p, req) => servicio.crearHito(u, p.id, b(req)));
  ruta('PATCH', '/api/hitos/{id}', (u, p, req) => servicio.actualizarHito(u, p.id, b(req), ver(req)));
  ruta('POST', '/api/hitos/{id}/completar', (u, p, req) => servicio.completarHito(u, p.id, b(req).fechaReal, ver(req)));
  ruta('DELETE', '/api/hitos/{id}', (u, p, req) => servicio.eliminarHito(u, p.id, ver(req)));
  ruta('GET', '/api/iniciativas/{id}/riesgos', (u, p) => servicio.listarRiesgos(u, p.id));
  ruta('POST', '/api/iniciativas/{id}/riesgos', (u, p, req) => servicio.crearRiesgo(u, p.id, b(req)));
  ruta('PATCH', '/api/riesgos/{id}', (u, p, req) => servicio.actualizarRiesgo(u, p.id, b(req), ver(req)));
  ruta('DELETE', '/api/riesgos/{id}', (u, p, req) => servicio.eliminarRiesgo(u, p.id, ver(req)));

  const json = (status, body, extra) => ({ status, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }, extra || {}), body: body === undefined ? '' : JSON.stringify(body) });
  return async function handle(req) {
    req.headers = Object.fromEntries(Object.entries(req.headers || {}).map(([k, v]) => [k.toLowerCase(), v])); req.query = req.query || {};
    const path = (req.path || '/').split('?')[0];
    const hit = R.map(([m, re, h]) => [m, path.match(re), h]).filter(x => x[1]);
    if (!hit.length) return json(404, { codigo: 'NO_ENCONTRADA', mensaje: 'Ruta no encontrada' });
    const r = hit.find(x => x[0] === req.method); if (!r) return json(405, { codigo: 'METODO', mensaje: 'Método no permitido' }, { allow: hit.map(x => x[0]).join(', ') });
    const u = path === '/api/salud' ? null : usuarioDe(req.headers, env);
    if (path !== '/api/salud' && !u) return json(401, { codigo: 'NO_AUTENTICADO', mensaje: 'Inicia sesión con tu cuenta Aramark' });
    if (u && !u.rol && path !== '/api/yo') return json(403, { codigo: 'SIN_PERMISO', mensaje: 'Tu cuenta no tiene un rol de APIH asignado' });
    try {
      const out = await r[2](u, r[1].groups || {}, req);
      const st = (req.method === 'PUT' && /\/api\/registros\//.test(path) && !ver(req)) ? 201 : req.method === 'POST' && /\/api\/(iniciativas|iniciativas\/[^/]+\/(hitos|riesgos))\/?$/.test(path) ? 201 : out === undefined ? 204 : 200;
      return json(st, out, out && out.version ? { etag: '"' + out.version + '"' } : null);
    } catch (e) {
      if (e.codigo && HTTP[e.codigo]) return json(HTTP[e.codigo], { codigo: e.codigo, mensaje: e.message, detalles: e.detalles });
      console.error(e); return json(500, { codigo: 'ERROR', mensaje: 'Error interno' });
    }
  };
};
