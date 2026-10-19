/* C2.22 · Paridad Prototipo ↔ Corporativo. Las dos SPA deben ser funcionalmente iguales: solo pueden diferir en el
 * hosting (CSP, sesión de Entra, ApiService/servidor) y en la versión. Cualquier otra diferencia hace fallar la prueba:
 * así un cambio hecho en un lado y no en el otro se detecta antes de publicar. Uso: node tests/unit/paridad-prototipo-corporativo.js */
'use strict';
const cp = require('child_process'), path = require('path'), R = p => path.join(__dirname, '..', '..', p);
const out = cp.spawnSync('diff', [R('index.html'), R('apps/corporativo/index.html')], { encoding: 'utf8', maxBuffer: 1 << 26 }).stdout;
const hunks = []; let h = null;
for (const l of out.split('\n')) { if (/^\d/.test(l)) { h = { cab: l, a: [], b: [] }; hunks.push(h); } else if (h && l.startsWith('< ')) h.a.push(l.slice(2)); else if (h && l.startsWith('> ')) h.b.push(l.slice(2)); }
/* Diferencias permitidas (hosting): cada regla debe reconocer TODAS las líneas cambiadas del hunk */
const PERMITIDA = [
  ['CSP y su comentario', h => [...h.a, ...h.b].every(l => /Content-Security-Policy|^\s*$|<!-- S-06/.test(l))],
  ['esAdminReal: rol de Entra en Corporativo', h => h.a.length === 0 && h.b.length === 1 && /AuthService\.provider === 'swa'\) return .*apih-admin/.test(h.b[0])],
  ['selección de backend (swa/ApiService)', h => [...h.a, ...h.b].every(l => /backendName|backendLabel|newSvc|function BK\(\)|provider === 'swa'|mode:? ?'api'|return 'api'/.test(l))],
  ['base vacía en modo api', h => [...h.a, ...h.b].every(l => /S\.empty && .*(this\.svc\.mode|supabase)/.test(l))],
  ['sincronización por lotes en modo api', h => [...h.a, ...h.b].every(l => /chunks|bat\.length|bat\.slice/.test(l))],
  ['aviso de rechazos del servidor en modo api', h => [...h.a, ...h.b].every(l => /badMsg|ultimoRechazo|svc\.mode === 'api'|else if \(typeof toast|El servidor no aceptó|registro\(s\) fueron rechazados|^\s*$/.test(l) || /toast\(/.test(l))],
  ['bloque ApiService y sesión de Azure', h => h.a.length === 0 && /C2\.2 · APIH Corporativo|ApiService|AuthService/.test(h.b.join('\n')) && h.b.length > 50],
  ['versión', h => [...h.a, ...h.b].every(l => /const VER = \{ v: '(V|C)\d/.test(l))],
  ['carga del paquete corporativo', h => h.a.length === 0 && h.b.every(l => /window\.APIH_CONFIG|apih-config|ApiService|swa/.test(l))]
];
const malas = hunks.filter(h => !PERMITIDA.some(([, f]) => f(h)));
if (malas.length) { console.error('✗ ' + malas.length + ' diferencia(s) Prototipo ↔ Corporativo fuera de las permitidas:'); malas.forEach(h => { console.error(' @' + h.cab); h.a.slice(0, 3).forEach(l => console.error('   proto │ ' + l.slice(0, 160))); h.b.slice(0, 3).forEach(l => console.error('   corp  │ ' + l.slice(0, 160))); }); process.exit(1); }
console.log('✓ paridad Prototipo ↔ Corporativo: ' + hunks.length + ' diferencias, todas de hosting/versión');
