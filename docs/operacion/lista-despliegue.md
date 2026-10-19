# APIH Corporativo · Lista de comprobación de despliegue (C2.20)

Para TI y Sistemas BISE. Cada etapa tiene una **puerta de salida**: no se pasa a la siguiente sin cumplirla.
Qué está verificado antes de entregar y qué solo puede verificarse en el ambiente de Aramark se indica al final.

## Etapa 0 · Antes de entregar (ya ejecutado por Sistemas BISE)
`node tools/verificar-paquete.js` · 16 comprobaciones: empaqueta la API igual que el pipeline, instala dependencias, carga la función con el SDK de Azure, arranca sin el árbol del repositorio, revisa la configuración de la SWA, el pipeline y compila el Bicep.
Más: pruebas unitarias, de contrato (3 adaptadores), de seguridad de la API (25) y de navegador contra la API local.

## Etapa 1 · Crear el ambiente dev (TI, ≈ 1 h) — `infra/README.md`
1. Grupos de Entra `APIH-Admin`, `APIH-Editor`, `APIH-Lectura` y grupo administrador de SQL.
2. `az deployment group create … infra/main.bicep` (completar los objectId en `dev.parameters.json`).
3. `infra/entra-registro.sh` (registro de la app, asignación requerida, grupos asignados a la app).
4. En Azure SQL, como admin Entra: `db/azure-sql/001_esquema.sql` y `002_permisos.sql`.
5. Secretos del pipeline: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `APIH_SWA_TOKEN`; variables `APIH_FUNC_NOMBRE`, `APIH_SWA_HOST`. El pipeline reemplaza `<TENANT-ID>` con `AZURE_TENANT_ID`.

**Puerta:** `APIH_SQL_PRUEBAS=si APIH_SQL_SERVER=… APIH_SQL_DB=… node tests/contract/run-azure-sql.js` → 19 casos de contrato contra Azure SQL **real**. Es la única prueba de que el almacenamiento SQL funciona; hasta hoy solo se probó con una base simulada.

## Etapa 2 · Pruebas de humo contra la URL real
1. El pipeline ejecuta `tests/e2e/verificar-despliegue.js` al terminar el despliegue (comprobaciones anónimas: salud, redirección a Entra, tenant, cabeceras, proveedores bloqueados).
2. Verificación completa con los tres roles: iniciar sesión en el navegador con una cuenta de cada grupo, copiar el valor de la cookie `StaticWebAppsAuthCookie` (DevTools → Application → Cookies) y ejecutar:
   `APIH_COOKIE_ADMIN=… APIH_COOKIE_EDITOR=… APIH_COOKIE_LECTURA=… node tests/e2e/verificar-despliegue.js https://<host-swa>`
   Crea datos «[VERIF]» y los borra al final. Las cookies son credenciales: no se guardan en el repositorio ni se pegan en chats.
3. Casos A1, D1 y V1 del guion UAT (`guion-uat.md`) con el navegador.

**Puerta:** 0 fallas y 0 omitidas. Una cuenta sin grupo debe ver «sin acceso»; el cierre de sesión debe funcionar en el equipo del usuario.

## Etapa 3 · UAT con datos migrados
Importar el respaldo del Prototipo (Admin → Importar respaldo), revisar los rechazos informados y ejecutar el guion UAT completo; comparar totales con el Prototipo.
**Puerta:** guion firmado por Sistemas BISE; sin hallazgos de severidad 1 o 2.

## Etapa 4 · Producción y piloto
Mismos pasos que dev en `rg-apih-prod` (aprobación de TI para el paso del pipeline). Piloto con pocos usuarios antes de la liberación general. Pendientes de producción en `docs/seguridad.md`: red privada y pentest sobre el ambiente real.
**Puerta:** respaldo y restauración probados (runbook §6), alertas de Application Insights activas (runbook §3).

## Etapa 5 · Vuelta atrás
Volver a desplegar el commit anterior (runbook §7). Los cambios de esquema son aditivos.

## Qué NO puede verificar Sistemas BISE sin el ambiente de Aramark
| Riesgo | Cómo se cubre |
| --- | --- |
| Azure SQL real (permisos de la identidad administrada, esquema aplicado, autopausa) | Etapa 1 · contrato contra SQL real. La conexión ya reintenta la autopausa (40613) |
| Inicio de sesión Entra y roles por grupos (`groupMembershipClaims`, asignación a la app) | Etapa 2 · `/api/yo` por rol y cuenta sin grupo |
| Directivas de la organización (acceso condicional, MFA, bloqueo de cookies de terceros en Teams) | Etapa 2/3 con usuarios reales, también dentro de Teams |
| Rendimiento con la carga real | Etapa 3; el Prototipo con 600 iniciativas tardó 2–5 s por vista (hallazgo S-15, sin virtualizar) |
| Red privada, WAF, DNS y certificado propio | Decisión de TI, pendiente de producción |
