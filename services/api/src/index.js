'use strict';
/* Arma la API según el entorno: APIH_STORE=mssql (Azure SQL, C2.1) o memoria (por defecto, desarrollo). */
const crearServicio = require('./servicio');
const crearApp = require('./app');
function crearStore(env) {
  if (env.APIH_STORE === 'mssql') return require('./store-mssql')(env);
  return require('./store-memoria')();
}
module.exports = function crearApi(env = process.env) {
  const store = crearStore(env);
  const servicio = crearServicio({ store, config: { umbralCritico: env.APIH_UMBRAL_CRITICO } });
  return { store, servicio, handle: crearApp({ servicio, env }) };
};
