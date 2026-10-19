# infra — despliegue de APIH Corporativo en Azure (C2.3)

**Estado:** plantillas escritas y revisadas; **no desplegadas** (sin acceso a Azure en la sesión de construcción). Se validan en el primer despliegue en dev.

## Lo que TI crea una vez por ambiente (≈ 1 hora)
1. Grupo de recursos `rg-apih-dev` y grupos de Entra `APIH-Admin`, `APIH-Editor`, `APIH-Lectura` (+ grupo administrador de SQL).
2. `az deployment group create -g rg-apih-dev -f infra/main.bicep -p infra/dev.parameters.json` (completar los objectId).
3. `SWA_NOMBRE=… SWA_RG=rg-apih-dev ./infra/entra-registro.sh` (registro de la app, asignación requerida, grupos).
4. En Azure SQL (como admin Entra): `db/azure-sql/001_esquema.sql` y `002_permisos.sql` (nombre de la Function App).
5. Pipeline: secretos `AZURE_CLIENT_ID/TENANT_ID/SUBSCRIPTION_ID` (OIDC) y `APIH_SWA_TOKEN`; variables `APIH_FUNC_NOMBRE`, `APIH_SWA_HOST`.
6. Validar (ver `docs/operacion/lista-despliegue.md`): `APIH_SQL_PRUEBAS=si … node tests/contract/run-azure-sql.js` y abrir la URL de la SWA.

## Recursos (dev)
| Recurso | SKU | Nota |
| --- | --- | --- |
| Static Web App | Standard | requerido para registro Entra propio y backend enlazado |
| Function App | Consumo (Y1), Linux, Node 20 | identidad administrada |
| Azure SQL | General Purpose serverless 0,5–1 vCore | autopausa 60 min en dev |
| Application Insights + Log Analytics | pago por uso | |
| Storage | LRS | requerido por Functions |
