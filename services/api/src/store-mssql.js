'use strict';
/* C2.1 — Almacenamiento en Azure SQL (db/azure-sql/001_esquema.sql). Misma interfaz que store-memoria.js.
 * Conexión sin contraseña: identidad administrada de la Function App (Entra ID) → base Azure SQL.
 *   APIH_SQL_SERVER=<servidor>.database.windows.net  APIH_SQL_DB=<base>  [APIH_SQL_AUTH=azure-active-directory-default]
 * La lógica SQL está separada del driver (crearStoreSql(ejecutor)) para poder probarla sin una base real. */
const { errorApi } = require('./errores');
const COLS = { iniciativas: 'apih.iniciativas', hitos: 'apih.hitos', riesgos: 'apih.riesgos' };
const SEQ = { PROP: 'apih.seq_PROP', PRJ: 'apih.seq_PRJ', HIT: 'apih.seq_HIT', RSK: 'apih.seq_RSK' };
const tabla = c => { const t = COLS[c]; if (!t) throw new Error('Colección desconocida: ' + c); return t; };
const verHex = v => Buffer.isBuffer(v) ? v.toString('hex') : String(v);
const fila = r => Object.assign(JSON.parse(r.doc), { id: r.id, version: verHex(r.ver) });
const doc = o => { const x = Object.assign({}, o); delete x.id; delete x.version; return JSON.stringify(x); };

/* ejecutor(sql, params) → Promise<filas>; ejecutor.tx(fn) ejecuta fn(ejecutorDeTransaccion) con commit/rollback */
function crearStoreSql(ejecutor) {
  const store = {
    async listar(col, filtro) { const rs = await ejecutor('SELECT id, doc, ver FROM ' + tabla(col), {}); return rs.map(fila).filter(x => !filtro || filtro(x)); },
    async obtener(col, id) { const rs = await ejecutor('SELECT id, doc, ver FROM ' + tabla(col) + ' WHERE id = @id', { id }); return rs.length ? fila(rs[0]) : null; },
    async insertar(col, obj, prefijo) {
      if (!SEQ[prefijo]) throw new Error('Prefijo desconocido: ' + prefijo);
      const rs = await ejecutor(
        'DECLARE @n INT = NEXT VALUE FOR ' + SEQ[prefijo] + ';\n' +
        "DECLARE @id VARCHAR(20) = @prefijo + '-' + RIGHT('00' + CAST(@n AS VARCHAR(10)), CASE WHEN @n < 1000 THEN 3 ELSE LEN(CAST(@n AS VARCHAR(10))) END);\n" +
        'INSERT INTO ' + tabla(col) + ' (id, doc, modificado_por) OUTPUT inserted.id, inserted.doc, inserted.ver VALUES (@id, @doc, @mp);',
        { prefijo, doc: doc(obj), mp: obj.modificadoPor || '' });
      return fila(rs[0]);
    },
    async actualizar(col, obj, version) {
      const rs = await ejecutor('UPDATE ' + tabla(col) + ' SET doc = @doc, modificado_por = @mp OUTPUT inserted.id, inserted.doc, inserted.ver WHERE id = @id AND ver = CONVERT(BINARY(8), @ver, 2);',
        { id: obj.id, doc: doc(obj), mp: obj.modificadoPor || '', ver: String(version) });
      if (rs.length) return fila(rs[0]);
      const ex = await ejecutor('SELECT 1 AS x FROM ' + tabla(col) + ' WHERE id = @id', { id: obj.id });
      throw ex.length ? errorApi('CONFLICTO', 'Otro usuario modificó ' + obj.id) : errorApi('NO_ENCONTRADA', 'No existe ' + obj.id);
    },
    async eliminar(col, id, version) {
      const cond = version == null ? '' : ' AND ver = CONVERT(BINARY(8), @ver, 2)';
      const rs = await ejecutor('DELETE FROM ' + tabla(col) + ' OUTPUT deleted.id WHERE id = @id' + cond + ';', { id, ver: version == null ? null : String(version) });
      if (rs.length) return;
      const ex = await ejecutor('SELECT 1 AS x FROM ' + tabla(col) + ' WHERE id = @id', { id });
      throw ex.length ? errorApi('CONFLICTO', 'Otro usuario modificó ' + id) : errorApi('NO_ENCONTRADA', 'No existe ' + id);
    },
    async tx(fn) { if (store._enTx) return fn(store); return ejecutor.tx(e => { const s = crearStoreSql(e); s._enTx = true; return fn(s); }); }
  };
  return store;
}

/* Ejecutor real con el paquete «mssql» (tedious). Se carga solo si APIH_STORE=mssql. */
function ejecutorMssql(env) {
  const sql = require('mssql');
  const pool = new sql.ConnectionPool({
    server: env.APIH_SQL_SERVER, database: env.APIH_SQL_DB, options: { encrypt: true },
    authentication: { type: env.APIH_SQL_AUTH || 'azure-active-directory-default', options: env.AZURE_CLIENT_ID ? { clientId: env.AZURE_CLIENT_ID } : {} },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
  });
  const listo = pool.connect();
  const correr = async (req, q, p) => { Object.entries(p).forEach(([k, v]) => req.input(k, v)); return (await req.query(q)).recordset || []; };
  const ej = async (q, p) => { await listo; return correr(pool.request(), q, p); };
  ej.tx = async fn => {
    await listo; const t = new sql.Transaction(pool); await t.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const et = (q, p) => correr(new sql.Request(t), q, p); et.tx = f => f(et);
    try { const r = await fn(et); await t.commit(); return r; } catch (e) { try { await t.rollback(); } catch (_) { } throw e; }
  };
  return ej;
}

module.exports = env => crearStoreSql(ejecutorMssql(env));
module.exports.crearStoreSql = crearStoreSql;
