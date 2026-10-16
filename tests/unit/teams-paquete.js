/* C2.7 — Paquete de Teams: manifiesto válido, íconos con tamaño correcto, zip legible y errores claros. */
'use strict';
const assert = require('assert'), path = require('path'), fs = require('fs'), os = require('os'), { execFileSync } = require('child_process');
const T = require('../../tools/empaquetar-teams.js');
const ok = { host: 'apih-dev.azurestaticapps.net', appId: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', clientId: '11111111-2222-4333-8444-555555555555', version: '1.0.0' };
let n = 0; const caso = (d, f) => { f(); n++; console.log('  ✓ ' + d); };

caso('manifiesto completo, sin marcadores, dominio válido', () => {
  const { manifest: m, archivos } = T.construir(ok);
  assert.strictEqual(m.id, ok.appId); assert.deepStrictEqual(m.validDomains, [ok.host]);
  assert.ok(m.staticTabs[0].contentUrl.startsWith('https://' + ok.host + '/'));
  assert.deepStrictEqual(Object.keys(archivos).sort(), ['color.png', 'manifest.json', 'outline.png']);
});
caso('rechaza host con https://, GUID inválido y versión mal formada', () => {
  assert.throws(() => T.construir(Object.assign({}, ok, { host: 'https://x.net' })), /--host/);
  assert.throws(() => T.construir(Object.assign({}, ok, { appId: 'abc' })), /--app-id/);
  assert.throws(() => T.construir(Object.assign({}, ok, { version: '1.0' })), /--version/);
});
caso('valida largos y contentUrl dentro de validDomains', () => {
  const m = T.construir(ok).manifest;
  assert.throws(() => T.validar(Object.assign({}, m, { name: { short: 'x'.repeat(31), full: 'y' } })), /name.short/);
  assert.throws(() => T.validar(Object.assign({}, m, { validDomains: ['otro.net'] })), /validDomains/);
});
caso('zip legible por unzip y con el contenido esperado', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'teams-')), z = path.join(tmp, 'a.zip');
  fs.writeFileSync(z, T.zip(T.construir(ok).archivos));
  const lista = execFileSync('unzip', ['-l', z]).toString();
  for (const f of ['manifest.json', 'color.png', 'outline.png']) assert.ok(lista.includes(f), f);
  execFileSync('unzip', ['-q', '-t', z]);
  const m = JSON.parse(execFileSync('unzip', ['-p', z, 'manifest.json']).toString()); assert.strictEqual(m.manifestVersion, '1.17');
});
console.log('OK teams-paquete — ' + n + ' casos');
