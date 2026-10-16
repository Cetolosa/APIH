'use strict';
/* Canales habilitados por configuración: APIH_NOTIF_CANALES=correo,teams (vacío = ninguno; «consola» para desarrollo). */
module.exports = function canalesDesdeEnv(env, f, log = console.log) {
  const fab = { correo: () => require('./graph-correo')(env, f), teams: () => require('./teams-webhook')(env, f), consola: () => async (d, a) => log('[notif] ' + d.nombre + ' <' + d.correo + '>: ' + a.length + ' avisos') };
  const out = {};
  for (const c of String(env.APIH_NOTIF_CANALES || '').split(',').map(s => s.trim()).filter(Boolean)) {
    if (!fab[c]) throw new Error('Canal desconocido: ' + c);
    out[c === 'consola' ? 'app' : c] = fab[c]();   /* «consola» simula la entrega del canal app */
  }
  return out;
};
