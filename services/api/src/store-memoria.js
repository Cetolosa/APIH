'use strict';
/* Almacenamiento en memoria (desarrollo y pruebas). Interfaz común a store-mssql.js:
 *   listar(col, filtro?) · obtener(col, id) · insertar(col, obj, prefijo) · actualizar(col, obj, version) · eliminar(col, id, version) · tx(fn)
 * version: token opaco que cambia en cada escritura (en Azure SQL: rowversion). */
const { errorApi } = require('./errores');
module.exports = function crearStoreMemoria() {
  const cols = {}, seq = {}; let rev = 0;
  const C = c => (cols[c] = cols[c] || new Map());
  const copia = x => x == null ? x : JSON.parse(JSON.stringify(x));
  const store = {
    async listar(col, filtro) { return [...C(col).values()].filter(x => !filtro || filtro(x)).map(copia); },
    async obtener(col, id) { return copia(C(col).get(id) || null); },
    async insertar(col, obj, prefijo) { const k = prefijo || col; seq[k] = (seq[k] || 0) + 1; const x = copia(obj); x.id = prefijo + '-' + String(seq[k]).padStart(3, '0'); x.version = String(++rev); C(col).set(x.id, x); return copia(x); },
    async actualizar(col, obj, version) { const a = C(col).get(obj.id); if (!a) throw errorApi('NO_ENCONTRADA', 'No existe ' + obj.id); if (a.version !== version) throw errorApi('CONFLICTO', 'Otro usuario modificó ' + obj.id); const x = copia(obj); x.version = String(++rev); C(col).set(x.id, x); return copia(x); },
    async eliminar(col, id, version) { const a = C(col).get(id); if (!a) throw errorApi('NO_ENCONTRADA', 'No existe ' + id); if (version != null && a.version !== version) throw errorApi('CONFLICTO', 'Otro usuario modificó ' + id); C(col).delete(id); },
    async tx(fn) { const snap = JSON.stringify([...Object.entries(cols)].map(([k, m]) => [k, [...m.entries()]])), s0 = JSON.stringify(seq), r0 = rev;
      try { return await fn(store); } catch (e) { Object.keys(cols).forEach(k => delete cols[k]); JSON.parse(snap).forEach(([k, es]) => { cols[k] = new Map(es); }); Object.keys(seq).forEach(k => delete seq[k]); Object.assign(seq, JSON.parse(s0)); rev = r0; throw e; } }
  };
  return store;
};
