# APIH Corporativo · Seguridad (C2.3)

## Arquitectura (3 capas, según TI)
`Navegador / Teams` → **Azure Static Web App** (SPA + sesión Entra ID) → **Function App** enlazada (API Node 20, reglas de negocio) → **Azure SQL** (identidad administrada).

## Identidad y acceso
| Control | Implementación | Dónde |
| --- | --- | --- |
| Inicio de sesión | Entra ID (registro propio del tenant Aramark), sin contraseñas en la app | `staticwebapp.config.json`, `infra/entra-registro.sh` |
| Solo usuarios autorizados | «Asignación requerida» en la aplicación empresarial; solo grupos APIH-* | `entra-registro.sh` |
| Roles | Grupos de Entra → roles `apih-admin/editor/lectura` (rolesSource) | `/api/roles`, `src/auth.js` |
| Autorización | Rutas protegidas por rol en SWA **y** verificación de rol en cada operación de la API | `staticwebapp.config.json`, `src/servicio.js` |
| Dominio | Se rechazan cuentas fuera de `@aramark.cl` | `APIH_DOMINIO` |
| Trazabilidad | `modificadoPor` sale de la identidad (no del cliente) + historial automático (tablas temporales) + auditoría de Azure SQL | `src/servicio.js`, `001_esquema.sql`, `main.bicep` |

## Datos
- Azure SQL con **solo autenticación Entra ID** (sin usuarios SQL ni contraseñas); la API entra con **identidad administrada**.
- Cifrado en tránsito (TLS 1.2+) y en reposo (TDE por defecto). Auditoría de Azure SQL hacia Log Analytics.
- Concurrencia optimista (`rowversion` + `If-Match`): nadie pisa cambios de otro sin saberlo.
- Respaldo: automático de Azure SQL (PITR 7 días por defecto; ajustar en prod).

## Aplicación
- Todas las reglas de negocio y validaciones en el servidor (contratos + 17 pruebas de contrato × 3 capas + 8 de seguridad). Desde C2.11 también las de subfases (forma estricta desde C2.16: ver `docs/revision-seguridad-2026-10-17.md`; cuerpos > 2 MB → 413; pentest interno 17-10 en `docs/pentest-2026-10-17.md`, 25 ataques a la API sin vulnerabilidades) (una sola fase, dentro de su ventana; se revisan las nuevas o modificadas) y categorías de hito; un dato inválido se rechaza con 422 y su motivo.
- SPA con CSP `connect-src 'self'` (solo su API), sin CDN; encabezados HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; `frame-ancestors` limitado a Teams/Office.
- Errores sin detalles internos (500 genérico, detalle en Application Insights).
- Sin secretos en el repositorio: el secreto de Entra vive en la configuración de SWA; despliegue con OIDC.

## OWASP Top 10 (resumen)
| Riesgo | Mitigación |
| --- | --- |
| A01 Control de acceso | Rol en SWA + rol en cada operación; prueba «sin rol → 403», «Lectura no escribe» |
| A02 Criptografía | TLS, TDE, sin secretos en código |
| A03 Inyección | Consultas parametrizadas (`mssql`), sin SQL dinámico con datos del usuario; CSP |
| A04 Diseño inseguro | Contratos y reglas en servidor; compuertas de fase |
| A05 Configuración | Infraestructura como código; `APIH_AUTH=dev` nunca en Azure (pruebas lo verifican) |
| A07 Autenticación | Entra ID + asignación requerida |
| A08 Integridad | Pipeline con pruebas obligatorias antes de desplegar |
| A09 Registro | Application Insights, auditoría SQL, historial temporal |

## Pendientes para producción (acordar con TI)
1. Red privada: VNet + private endpoint para Azure SQL y Function App (hoy: «Allow Azure services»).
2. Revisión de seguridad/pentest de TI antes del 27-11.
3. Rotación del secreto de Entra (vence en 1 año) o migrar a credenciales federadas cuando SWA lo permita.
4. Política de retención del historial temporal.
