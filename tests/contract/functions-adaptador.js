/* C2.0 — El adaptador de Azure Functions (services/api/functions/api.js) traduce bien Request/Response.
 * Sin red al registro npm: se simula @azure/functions (app.http) con la misma firma del modelo v4. */
'use strict';
const assert = require('assert'), Module = require('module'), path = require('path');
module.exports = async function (log = console.log) {
  let reg = null; const fake = { app: { http: (name, o) => { reg = Object.assign({ name }, o); } } };
  const orig = Module._resolveFilename; Module._resolveFilename = function (r, ...a) { return r === '@azure/functions' ? '@azure/functions' : orig.call(this, r, ...a); };
  require.cache['@azure/functions'] = { id: '@azure/functions', filename: '@azure/functions', loaded: true, exports: fake };
  process.env.APIH_AUTH = 'dev'; delete require.cache[require.resolve('../../services/api/functions/api.js')];
  require('../../services/api/functions/api.js'); Module._resolveFilename = orig;
  assert.ok(reg && reg.route === '{*ruta}' && reg.methods.includes('PATCH'));
  const req = (method, url, body, h) => ({ method, url: 'https://apih.azurestaticapps.net' + url, headers: new Map(Object.entries(Object.assign({ 'x-dev-user': 'ana@aramark.cl', 'x-dev-rol': 'Editor' }, h || {}))), text: async () => body == null ? '' : typeof body === 'string' ? body : JSON.stringify(body) });
  const c = await reg.handler(req('POST', '/api/iniciativas', { tipo: 'Propuesta', titulo: 'Desde Functions', fase: 'Recepción', estado: 'Vigente', lider: 'Ana' }));
  assert.strictEqual(c.status, 201); const j = JSON.parse(c.body); assert.match(j.id, /^PROP-/);
  const l = await reg.handler(req('GET', '/api/iniciativas?tipo=Propuesta')); assert.strictEqual(JSON.parse(l.body).length, 1);
  assert.strictEqual((await reg.handler(req('POST', '/api/iniciativas', '{malo'))).status, 400);
  delete process.env.APIH_AUTH;
  log('  ✓ functions/api.js registra la ruta y traduce petición/respuesta (201, filtros, JSON inválido → 400)');
  return 1;
};
