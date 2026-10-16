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
