/* APIH Corporativo — packages/core
 * Reglas puras, sin DOM ni estado global. Script clásico: navegador (window.APIHCore) y Node (module.exports).
 * Versión del Corporativo (independiente de las V22.x del Prototipo).
 * Origen: index.html V22.52 (fechas l.854-858, riesgo l.1136-1138). Equivalencia: tests/unit/core-equivalencia.js
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.APIHCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = { v: 'C1.0', b: '15-10-2026', origen: 'V22.52' };

  /* ---------- fechas (ISO 'AAAA-MM-DD', hora local fija 12:00 para evitar saltos por horario de verano) ---------- */
  const pad = n => String(n).padStart(2, '0');
  const toISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const pD = s => { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const addD = (s, n) => { const d = pD(s); d.setDate(d.getDate() + n); return toISO(d); };
  const diffD = (a, b) => Math.round((pD(a) - pD(b)) / 864e5);   // a - b en días

  /* ---------- riesgo ---------- */
  const expo = r => r.prob * r.imp;
  // umbral: valor de 'umbralCritico' (en el Prototipo viene de cfgMi). Alto >= 10, Medio >= 5 son fijos.
  const nivelRiesgo = (e, umbral) => e >= umbral ? { n: 'Crítico', c: '#D13438' } : e >= 10 ? { n: 'Alto', c: '#CA5010' } : e >= 5 ? { n: 'Medio', c: '#F2A100' } : { n: 'Bajo', c: '#107C10' };
  const riesgoAbierto = r => r.estado !== 'Cerrado';

  return Object.freeze({ VERSION, pad, toISO, pD, addD, diffD, expo, nivelRiesgo, riesgoAbierto });
});
