'use strict';
/* C2.8 — Notificaciones en servidor (punto 9 de la propuesta).
 * Cálculo: packages/core/notif-motor.js (las mismas reglas que la campana de la SPA, generadas desde su código).
 * Envío: adaptadores por canal, intercambiables según lo que defina TI. Cada aviso se envía una sola vez por persona y canal
 * (registro en la lista APIH_NotifEnviadas). Un resumen por persona y canal en cada corrida.
 *   canales.correo(destinatario, avisos)  → p. ej. Microsoft Graph sendMail desde un buzón compartido (canales/graph-correo.js)
 *   canales.teams(destinatario, avisos)   → p. ej. webhook de un flujo de Power Automate de TI (canales/teams-webhook.js)
 *   canales.consola                       → desarrollo: solo registra */
let motor; try { motor = require('../../../packages/core/notif-motor.js'); } catch (e) { motor = require('../core/notif-motor.js'); }   /* repo o paquete de despliegue */
const { crearMotor } = motor;
const LISTAS = { decisiones: 'APIH_Decisiones', compromisos: 'APIH_Compromisos', cambios: 'APIH_Cambios', notas: 'APIH_Notas', documentos: 'APIH_Documentos', bitacora: 'APIH_Bitacora', comites: 'APIH_Comites' };
const ENVIADAS = 'APIH_NotifEnviadas';
const nrm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const parse = t => { try { return JSON.parse(t); } catch (e) { return null; } };

/* Ajustes guardados por la SPA (clave → JSON; los valores grandes van en trozos clave#1..n) */
function ajustes(regs) {
  const m = new Map(regs.map(r => [r.id, r.datos]));
  const valor = k => { const v = parse(m.get(k)); if (v && v.__chunks) { let s = ''; for (let i = 1; i <= v.__chunks; i++) s += m.get(k + '#' + i) || ''; return parse(s); } return v; };
  return valor;
}

/* Lee la base con la forma de datos de la SPA */
async function cargarDatos(store) {
  const sinVer = o => { const x = Object.assign({}, o); delete x.version; delete x.semaforo; return x; };
  const ini = (await store.listar('iniciativas')).map(o => { const x = sinVer(o); if (Array.isArray(x.area)) x.area = x.area.join(','); return x; });
  const d = { ini, hitos: (await store.listar('hitos')).map(sinVer), riesgos: (await store.listar('riesgos')).map(sinVer) };
  for (const [k, l] of Object.entries(LISTAS)) d[k] = (await store.listar('reg:' + l)).map(r => parse(r.datos)).filter(Boolean);
  const cfg = ajustes(await store.listar('reg:APIH_Config')), roles = ajustes(await store.listar('reg:APIH_Roles'));
  d.cfg = cfg('cfg') || {}; d.cfgU = cfg('cfgU') || {}; d.usuarios = roles('usuarios') || cfg('usuarios') || [];
  return d;
}

/* Persona de APIH para un usuario autenticado (por correo; si no, por nombre) */
function personaDe(datos, u) {
  const p = (datos.usuarios || []).find(x => u.email && nrm(x.correo) === nrm(u.email)) || (datos.usuarios || []).find(x => nrm(x.n) === nrm(u.nombre));
  return p ? p.n : (u.nombre || u.email);
}

function avisosDe(datos, persona, hoy) { return crearMotor(datos, persona, hoy).avisos(); }

/* Corrida de envío. simular=true: calcula y devuelve, sin enviar ni registrar. */
async function despachar({ store, hoy, canales = {}, simular = false, ahora = () => new Date().toISOString() }) {
  const datos = await cargarDatos(store);
  const enviadas = new Set((await store.listar('reg:' + ENVIADAS)).map(r => r.id));
  const res = { hoy, personas: 0, envios: [], omitidosSinCorreo: [], errores: [] };
  for (const p of datos.usuarios || []) {
    if (!p || !p.n) continue;
    const avisos = avisosDe(datos, p.n, hoy); if (!avisos.length) continue; res.personas++;
    for (const canal of Object.keys(canales)) {
      const id = a => nrm(p.n) + '|' + canal + '|' + a.key;
      const nuevos = avisos.filter(a => a.canales.includes(canal) && !enviadas.has(id(a))); if (!nuevos.length) continue;
      if (!p.correo) { res.omitidosSinCorreo.push(p.n); continue; }
      const dest = { nombre: p.n, correo: p.correo };
      if (simular) { res.envios.push({ persona: p.n, canal, avisos: nuevos.length, simulado: true }); continue; }
      try {
        await canales[canal](dest, nuevos);
        for (const a of nuevos) await store.insertar('reg:' + ENVIADAS, { id: id(a), datos: JSON.stringify({ persona: p.n, canal, key: a.key, tipo: a.tipo, enviado: ahora() }), modificadoPor: 'notificaciones' });
        res.envios.push({ persona: p.n, canal, avisos: nuevos.length });
      } catch (e) { res.errores.push({ persona: p.n, canal, error: String(e.message || e) }); }
    }
  }
  res.omitidosSinCorreo = [...new Set(res.omitidosSinCorreo)];
  return res;
}

/* Texto del resumen (correo / Teams) */
function resumen(dest, avisos, urlApp) {
  const orden = avisos.slice().sort((a, b) => b.sev - a.sev);
  const asunto = 'APIH · ' + avisos.length + (avisos.length === 1 ? ' aviso nuevo' : ' avisos nuevos');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const html = `<p>Hola ${esc(dest.nombre)}:</p><ul>${orden.map(a => `<li><b>${esc(a.titulo)}</b>: ${esc(a.texto)}</li>`).join('')}</ul>` +
    (urlApp ? `<p><a href="${esc(urlApp)}">Abrir APIH</a></p>` : '') + '<p><small>Puedes ajustar qué avisos recibes en APIH → Notificaciones.</small></p>';
  const texto = orden.map(a => '• ' + a.titulo + ': ' + a.texto).join('\n');
  return { asunto, html, texto };
}

module.exports = { cargarDatos, personaDe, avisosDe, despachar, resumen, ENVIADAS };
