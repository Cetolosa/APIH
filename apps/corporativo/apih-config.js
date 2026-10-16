/* APIH Corporativo (C2.2) — configuración pública. Sin claves: la sesión la maneja Azure Static Web Apps (Entra ID). */
window.APIH_OVERRIDE = {
  auth: { provider: 'swa' },
  api: { base: '/api' },
  ia: false
};
