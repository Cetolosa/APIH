'use strict';
/* Canal correo vía Microsoft Graph (sendMail) con la identidad administrada de la Function App: sin contraseñas ni secretos.
 * TI define: buzón remitente (APIH_CORREO_REMITENTE) y el permiso Mail.Send de aplicación, idealmente limitado a ese buzón
 * con una Application Access Policy de Exchange Online. */
const { resumen } = require('../notificaciones');
async function tokenGraph(env, f) {
  if (!env.IDENTITY_ENDPOINT || !env.IDENTITY_HEADER) throw new Error('Sin identidad administrada (IDENTITY_ENDPOINT)');
  const q = new URLSearchParams({ resource: 'https://graph.microsoft.com', 'api-version': '2019-08-01' }); if (env.AZURE_CLIENT_ID) q.set('client_id', env.AZURE_CLIENT_ID);
  const r = await f(env.IDENTITY_ENDPOINT + '?' + q, { headers: { 'X-IDENTITY-HEADER': env.IDENTITY_HEADER } });
  if (!r.ok) throw new Error('Token de Graph: HTTP ' + r.status); return (await r.json()).access_token;
}
module.exports = function canalGraphCorreo(env, f = fetch) {
  if (!env.APIH_CORREO_REMITENTE) throw new Error('Falta APIH_CORREO_REMITENTE');
  return async (dest, avisos) => {
    const m = resumen(dest, avisos, env.APIH_URL_APP), tk = await tokenGraph(env, f);
    const r = await f('https://graph.microsoft.com/v1.0/users/' + encodeURIComponent(env.APIH_CORREO_REMITENTE) + '/sendMail', {
      method: 'POST', headers: { authorization: 'Bearer ' + tk, 'content-type': 'application/json' },
      body: JSON.stringify({ message: { subject: m.asunto, body: { contentType: 'HTML', content: m.html }, toRecipients: [{ emailAddress: { address: dest.correo, name: dest.nombre } }] }, saveToSentItems: false })
    });
    if (r.status !== 202) throw new Error('sendMail: HTTP ' + r.status);
  };
};
