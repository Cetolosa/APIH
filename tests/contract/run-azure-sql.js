/* C2.1 — Contrato completo contra una base Azure SQL REAL (ambiente dev). Crea y modifica datos: usar solo en dev.
 * Requisitos: npm i mssql (en services/api), esquema db/azure-sql/001_esquema.sql aplicado, identidad con permisos.
 * Uso: APIH_SQL_PRUEBAS=si APIH_SQL_SERVER=... APIH_SQL_DB=... node tests/contract/run-azure-sql.js */
'use strict';
if (process.env.APIH_SQL_PRUEBAS !== 'si') { console.error('Define APIH_SQL_PRUEBAS=si (solo ambiente dev).'); process.exit(2); }
const A = require('./adaptadores.js'), store = require('../../services/api/src/store-mssql')(process.env);
require('./iniciativa.contract.js')(o => A.http(o, store)).then(n => { console.log('✓ ' + n + ' casos de contrato contra Azure SQL'); process.exit(0); }, e => { console.error('✗', e.message); process.exit(1); });
