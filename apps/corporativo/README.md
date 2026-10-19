# apps/corporativo — SPA de APIH Corporativo (C2.21)

Copia de la interfaz del Prototipo **V22.64** que continúa con versión C (ADR-002). Diferencias:

| Tema | Prototipo | Corporativo |
| --- | --- | --- |
| Sesión | Supabase (contraseña) | **Azure Static Web Apps + Entra ID** (cuenta Aramark, sin contraseñas en la app) |
| Datos | Supabase (`registros`) | **API propia** (`/api`) → Azure SQL |
| Reglas | En el navegador | **En el servidor**: estado y fase van por su operación; compuertas, validaciones y permisos los decide la API |
| Política de seguridad (CSP) | conecta a Supabase, Graph y SharePoint | `connect-src 'self'` (solo su propia API) |
| Si el servidor rechaza un cambio | — | Aviso con el motivo (p. ej. compuerta no cumplida) y recarga de los datos vigentes |

Iniciativas, hitos y riesgos usan sus operaciones con reglas (`ApiService` en `index.html`). El resto de colecciones (decisiones, bitácora, comités, compromisos, cambios, notas, documentos, parámetros) usa `/api/registros/{lista}` hasta tener contrato propio.

## Probar en local
`APIH_DEV_USER=nombre.apellido@aramark.cl APIH_DEV_ROL=Admin node services/api/server.js` → http://localhost:7071 (simula la sesión de Static Web Apps).
Primera carga sobre una base vacía: hacerla con rol **Admin** (crea usuarios y parámetros iniciales).

Prueba e2e: `tests/e2e/corp1.js` (ver encabezado).
