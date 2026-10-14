/* Configuración pública de APIH (se puede editar directo en GitHub, sin recompilar).
   Ambos valores son PÚBLICOS por diseño: la seguridad real está en el inicio de sesión individual y en las reglas del servidor (RLS).
   Los obtienes en Supabase → Project Settings → API:  "Project URL"  y  la clave "anon / publishable".
   NUNCA pegues aquí la clave "service_role". */
window.APIH_OVERRIDE = {
  auth: { provider: 'supabase' },
  supabase: {
    url: 'https://hpsjzuqcijjwthrxgmeu.supabase.co',
    anonKey: 'sb_publishable__j0Wnhk0dwEoGTFZHrGafQ_B_X5KIC2'
  },
  ia: false
};
