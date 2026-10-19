/* C2.20 · La conexión a Azure SQL reintenta errores transitorios (autopausa serverless, 40613), no cachea fallos
 * y no deja promesas rechazadas sueltas. Se prueba con un «mssql» simulado (sin base real). */
'use strict';
const assert = require('assert'), Module = require('module');
let fallos = [], conexiones = 0, cerradas = 0;
const falso = {
  ConnectionPool: class { async connect() { conexiones++; if (fallos.length) { const c = fallos.shift(); const e = new Error('simulado ' + c); e.number = c; throw e; } } async close() { cerradas++; } request() { return { input() { }, async query() { return { recordset: [] }; } }; } },
  Transaction: class { }, Request: class { }, ISOLATION_LEVEL: { SERIALIZABLE: 1 }
};
const orig = Module._load; Module._load = function (n, ...a) { return n === 'mssql' ? falso : orig.call(this, n, ...a); };
process.on('unhandledRejection', e => { console.error('✗ promesa rechazada sin manejar:', e.message); process.exit(1); });
const crear = () => { delete require.cache[require.resolve('../../services/api/src/store-mssql')]; return require('../../services/api/src/store-mssql'); };
(async () => {
  const env = { APIH_SQL_SERVER: 's', APIH_SQL_DB: 'd', APIH_SQL_PAUSA_MS: '5', APIH_SQL_INTENTOS: '4' };
  /* 1. Autopausa: 2 fallos 40613 y luego conecta */
  fallos = [40613, 40613]; conexiones = 0;
  let st = crear()(env); assert.strictEqual(conexiones, 0, 'no conecta al cargar (perezoso)');
  await new Promise(r => setTimeout(r, 20));   /* si hubiera promesa suelta, saltaría unhandledRejection */
  await st.listar('iniciativas'); assert.strictEqual(conexiones, 3, 'reintentó 2 veces y conectó a la 3ª'); assert.strictEqual(cerradas, 2);
  await st.listar('iniciativas'); assert.strictEqual(conexiones, 3, 'reutiliza la conexión');
  /* 2. Error no transitorio (login inválido, permiso): falla de inmediato y no queda cacheado */
  fallos = [18456]; conexiones = 0; st = crear()(env);
  await assert.rejects(st.listar('iniciativas'), /18456/); assert.strictEqual(conexiones, 1);
  await st.listar('iniciativas'); assert.strictEqual(conexiones, 2, 'tras el fallo vuelve a intentar (no cachea el rechazo)');
  /* 3. Transitorio persistente: se rinde tras APIH_SQL_INTENTOS */
  fallos = [40613, 40613, 40613, 40613, 40613]; conexiones = 0; st = crear()(env);
  await assert.rejects(st.listar('iniciativas'), /40613/); assert.strictEqual(conexiones, 4);
  console.log('✓ mssql-conexion: reintentos de autopausa, sin caché de fallos, sin promesas sueltas');
  process.exit(0);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
