'use strict';
/* Canal Teams vía webhook de un flujo de Power Automate / Workflows administrado por TI (APIH_TEAMS_WEBHOOK, guardado como
 * configuración protegida, nunca en el repositorio). El flujo recibe { para, nombre, asunto, texto, avisos[] } y publica
 * el mensaje en el chat de esa persona (acción «Publicar mensaje en un chat» con el bot de Flow). */
const { resumen } = require('../notificaciones');
module.exports = function canalTeamsWebhook(env, f = fetch) {
  if (!/^https:\/\//.test(env.APIH_TEAMS_WEBHOOK || '')) throw new Error('Falta APIH_TEAMS_WEBHOOK (https)');
  return async (dest, avisos) => {
    const m = resumen(dest, avisos, env.APIH_URL_APP);
    const r = await f(env.APIH_TEAMS_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ para: dest.correo, nombre: dest.nombre, asunto: m.asunto, texto: m.texto, url: env.APIH_URL_APP || '', avisos: avisos.map(a => ({ tipo: a.tipo, titulo: a.titulo, texto: a.texto, sev: a.sev, ini: a.ini })) }) });
    if (!r.ok) throw new Error('Webhook Teams: HTTP ' + r.status);
  };
};
