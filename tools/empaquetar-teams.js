'use strict';
/* C2.7 — Empaqueta la app de Teams de APIH (manifiesto + íconos) en un .zip listo para cargar en el centro de administración de Teams.
 * Uso: node tools/empaquetar-teams.js --host <app>.azurestaticapps.net --app-id <GUID> --client-id <GUID> [--version 1.0.0] [--out dist/apih-teams.zip]
 * Sin dependencias: valida el manifiesto (campos obligatorios, GUID, dominios, íconos) y escribe el zip a mano. */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const dir = path.join(__dirname, '..', 'apps', 'teams');
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOST = /^(?=.{4,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/i;

function pngTam(buf) { if (buf.toString('latin1', 1, 4) !== 'PNG') return null; return [buf.readUInt32BE(16), buf.readUInt32BE(20)]; }

function construir({ host, appId, clientId, version = '1.0.0' }) {
  const err = [];
  if (!HOST.test(host || '')) err.push('--host inválido (ej. apih-xyz.azurestaticapps.net, sin https://)');
  if (!GUID.test(appId || '')) err.push('--app-id debe ser un GUID');
  if (!GUID.test(clientId || '')) err.push('--client-id debe ser el GUID del registro de Entra ID');
  if (!/^\d+\.\d+\.\d+$/.test(version)) err.push('--version debe ser x.y.z');
  if (err.length) throw new Error(err.join('\n'));
  const txt = fs.readFileSync(path.join(dir, 'manifest.template.json'), 'utf8')
    .replace(/\{\{SWA_HOST\}\}/g, host).replace(/\{\{APP_ID\}\}/g, appId)
    .replace(/\{\{ENTRA_CLIENT_ID\}\}/g, clientId).replace(/\{\{VERSION\}\}/g, version);
  const m = JSON.parse(txt);
  validar(m);
  const iconos = {};
  for (const [k, tam] of [['color', 192], ['outline', 32]]) {
    const b = fs.readFileSync(path.join(dir, m.icons[k])); const t = pngTam(b);
    if (!t || t[0] !== tam || t[1] !== tam) throw new Error('Ícono ' + k + ' debe ser PNG ' + tam + '×' + tam);
    iconos[m.icons[k]] = b;
  }
  return { manifest: m, archivos: Object.assign({ 'manifest.json': Buffer.from(JSON.stringify(m, null, 2)) }, iconos) };
}

function validar(m) {
  const req = ['manifestVersion', 'version', 'id', 'developer', 'name', 'description', 'icons', 'accentColor'];
  const falta = req.filter(k => m[k] == null); if (falta.length) throw new Error('Faltan campos: ' + falta.join(', '));
  if (m.name.short.length > 30) throw new Error('name.short > 30');
  if (m.name.full.length > 100) throw new Error('name.full > 100');
  if (m.description.short.length > 80) throw new Error('description.short > 80');
  if (m.description.full.length > 4000) throw new Error('description.full > 4000');
  if (!/^#[0-9a-f]{6}$/i.test(m.accentColor)) throw new Error('accentColor inválido');
  for (const t of m.staticTabs || []) {
    const h = new URL(t.contentUrl);
    if (h.protocol !== 'https:') throw new Error('contentUrl debe ser https');
    if (!m.validDomains.includes(h.hostname)) throw new Error('contentUrl fuera de validDomains');
  }
  if (/\{\{/.test(JSON.stringify(m))) throw new Error('Quedan marcadores sin reemplazar');
}

/* zip mínimo (deflate), sin dependencias */
const TABLA = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (const x of b) c = TABLA[(c ^ x) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(archivos) {
  const loc = [], cen = []; let off = 0;
  for (const [nombre, datos] of Object.entries(archivos)) {
    const n = Buffer.from(nombre), z = zlib.deflateRawSync(datos), crc = crc32(datos);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(8, 8);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(z.length, 18); h.writeUInt32LE(datos.length, 22); h.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(z.length, 20); c.writeUInt32LE(datos.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    loc.push(h, n, z); cen.push(c, n); off += 30 + n.length + z.length;
  }
  const cd = Buffer.concat(cen), e = Buffer.alloc(22); const k = Object.keys(archivos).length;
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(k, 8); e.writeUInt16LE(k, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...loc, cd, e]);
}

if (require.main === module) {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i += 2) o[a[i].replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = a[i + 1];
  try {
    const { archivos } = construir(o); const out = o.out || path.join('dist', 'apih-teams.zip');
    fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, zip(archivos));
    console.log('OK ' + out + ' (' + Object.keys(archivos).join(', ') + ')');
  } catch (e) { console.error(e.message); process.exit(1); }
}
module.exports = { construir, validar, zip };
