'use strict';
/* Identidad del usuario.
 * Producción (Azure Static Web Apps + API enlazada): SWA autentica con Entra ID y entrega el principal en el
 *   encabezado x-ms-client-principal (base64 JSON). Los roles vienen de userRoles, asignados por grupos de Entra
 *   (APIH-Admin / APIH-Editor / APIH-Lectura) mediante la función rolesSource o invitaciones de SWA.
 * Desarrollo (APIH_AUTH=dev): encabezados x-dev-user y x-dev-rol. NUNCA habilitar en Azure.
 * El sello modificadoPor sale siempre de aquí, nunca del cuerpo de la petición. */
const ROLES = ['Admin', 'Editor', 'Lectura'];
const MAPA = { 'apih-admin': 'Admin', 'apih-editor': 'Editor', 'apih-lectura': 'Lectura', admin: 'Admin', editor: 'Editor', lectura: 'Lectura' };
const rolDe = lista => { const r = (lista || []).map(x => MAPA[String(x).toLowerCase()]).filter(Boolean); return ROLES.find(x => r.includes(x)) || null; };
function usuarioDe(headers, env = process.env) {
  const h = k => headers[k] || headers[k.toLowerCase()];
  if (env.APIH_AUTH === 'dev') { const e = h('x-dev-user'); if (!e) return null; return { email: String(e).toLowerCase(), nombre: e, rol: ROLES.includes(h('x-dev-rol')) ? h('x-dev-rol') : 'Lectura' }; }
  const p = h('x-ms-client-principal'); if (!p) return null;
  try { const j = JSON.parse(Buffer.from(p, 'base64').toString('utf8')); const email = String(j.userDetails || '').toLowerCase();
    if (env.APIH_DOMINIO && !email.endsWith('@' + env.APIH_DOMINIO)) return null;
    return { email, nombre: j.userDetails, rol: rolDe(j.userRoles) }; } catch (e) { return null; }
}
module.exports = { usuarioDe, rolDe, ROLES };
