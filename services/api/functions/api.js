'use strict';
/* Azure Functions (modelo de programación v4, Node 20+). Una sola función HTTP que delega en el enrutador.
 * En Static Web Apps la API enlazada recibe /api/* con el principal en x-ms-client-principal. */
const { app } = require('@azure/functions');
const crearApi = require('../src/index');
const api = crearApi(process.env);
app.http('apih', {
  route: '{*ruta}', methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'], authLevel: 'anonymous',
  handler: async (request) => {
    const url = new URL(request.url), headers = Object.fromEntries(request.headers.entries());
    let body = null; if (['POST', 'PATCH', 'PUT'].includes(request.method)) { const t = await request.text(); if (t) { try { body = JSON.parse(t); } catch (e) { return { status: 400, jsonBody: { codigo: 'INVALIDA', mensaje: 'JSON inválido' } }; } } }
    const r = await api.handle({ method: request.method, path: url.pathname, query: Object.fromEntries(url.searchParams), headers, body });
    return { status: r.status, headers: r.headers, body: r.body };
  }
});

/* C2.8 — Envío programado de notificaciones (lunes a viernes 08:00 Chile ≈ 11:00 UTC; ajustable con APIH_NOTIF_CRON).
 * Solo se registra si TI habilitó al menos un canal (APIH_NOTIF_CANALES). */
if (process.env.APIH_NOTIF_CANALES) {
  const canales = require('../src/canales')(process.env);
  app.timer('apih-notificaciones', {
    schedule: process.env.APIH_NOTIF_CRON || '0 0 11 * * 1-5',
    handler: async (t, ctx) => { const r = await api.servicio.despacharNotificaciones(null, { canales, simular: false }); ctx.log('APIH notificaciones', JSON.stringify({ personas: r.personas, envios: r.envios.length, errores: r.errores })); }
  });
}
