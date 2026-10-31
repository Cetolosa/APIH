/* Configuración pública de APIH Prototipo Despliegue (proyecto Supabase propio, con datos reales del portafolio).
   La URL y la clave publishable no se guardan en el repositorio: el despliegue las inyecta desde las variables de Actions
   SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY. La seguridad real está en el login individual y en RLS.
   NUNCA pegues aquí la clave "secret" / "service_role". */
window.APIH_OVERRIDE = {
  auth: { provider: 'supabase' },
  supabase: {
    url: '',      /* la inyecta el despliegue desde la variable de Actions SUPABASE_URL */
    anonKey: ''   /* la inyecta el despliegue desde la variable de Actions SUPABASE_PUBLISHABLE_KEY */
  }
};
/* Versión del prototipo de despliegue. Fecha y commit se completan en el despliegue. */
window.APIH_BUILD = { v: 'D1.0', b: '', c: '' };
