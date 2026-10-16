'use strict';
/* Errores del contrato (packages/core/contracts/iniciativa.md §Errores) */
const HTTP = { NO_ENCONTRADA: 404, INVALIDA: 422, CONFLICTO: 409, SIN_PERMISO: 403, COMPUERTA: 422, NO_AUTENTICADO: 401 };
function errorApi(codigo, mensaje, detalles) { const e = new Error(mensaje); e.codigo = codigo; if (detalles && detalles.length) e.detalles = detalles; return e; }
module.exports = { HTTP, errorApi };
