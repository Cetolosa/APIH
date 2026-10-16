# services/api — APIH Corporativo (C2.0)

API REST con **todas las reglas de negocio en el servidor**, sobre `packages/core`. Node.js 20+, sin estado.

| Archivo | Rol |
| --- | --- |
| `src/servicio.js` | Reglas del contrato (iniciativas, hitos, riesgos, compuertas, permisos por rol) |
| `src/app.js` | Enrutador HTTP independiente del hosting (rutas REST, `If-Match`/`ETag`, códigos de error) |
| `src/auth.js` | Identidad: `x-ms-client-principal` de Static Web Apps (Entra ID) · modo `dev` solo local |
| `src/store-memoria.js` | Almacenamiento en memoria (desarrollo/pruebas) · `store-mssql.js` (Azure SQL) en C2.1 |
| `functions/api.js` | Adaptador Azure Functions v4 (una función HTTP `{*ruta}`) |
| `server.js` | Servidor local: API + SPA de `apps/corporativo` |

## Ejecutar en local
`APIH_AUTH=dev node services/api/server.js` → http://localhost:7071 · encabezados `x-dev-user` y `x-dev-rol` (Admin/Editor/Lectura).

## Variables de entorno
| Variable | Uso |
| --- | --- |
| `APIH_STORE` | `mssql` en Azure (C2.1); memoria si no se indica |
| `APIH_DOMINIO` | p. ej. `aramark.cl`: rechaza cuentas de otro dominio |
| `APIH_UMBRAL_CRITICO` | exposición desde la que un riesgo es crítico (por defecto 15) |
| `APIH_AUTH` | `dev` solo en local. **Nunca en Azure.** |

## Roles (grupos de Entra ID → roles de Static Web Apps)
`APIH-Admin` → Admin · `APIH-Editor` → Editor (lee y escribe) · `APIH-Lectura` → Lectura. Sin rol: 403.

## Rutas
Ver `packages/core/contracts/iniciativa.md` y `hitos-riesgos.md`. Además: `GET /api/salud` (pública), `GET /api/yo`.

## Pruebas
`node tests/contract/run.js`: 15 casos de contrato contra el servicio y contra HTTP, 7 de seguridad/protocolo y el adaptador de Functions.
