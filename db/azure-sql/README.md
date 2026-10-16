# db/azure-sql — APIH Corporativo (C2.1)

| Script | Qué hace |
| --- | --- |
| `001_esquema.sql` | Esquema `apih`: tablas `iniciativas`, `hitos`, `riesgos` (documento JSON + columnas calculadas indexadas), secuencias de ids, **tablas temporales** (historial automático de cada cambio en `*_historial`) y vistas de reporte `vw_*`. Idempotente. |
| `002_permisos.sql` | Usuario de la base para la **identidad administrada** de la API (sin contraseñas) y acceso opcional de solo lectura a vistas. |

## Modelo (ADR-009)
- Cada registro guarda el objeto validado por la API en `doc` (JSON, `CHECK ISJSON`). Las reglas viven en la API, no se duplican en triggers.
- Columnas calculadas persistidas (`tipo`, `fase`, `estado`, `ini`, `fecha`…) permiten índices, filtros y Power BI sin leer el JSON.
- `ver ROWVERSION`: control de concurrencia (la API compara la versión leída; si cambió → 409 CONFLICTO).
- `SYSTEM_VERSIONING`: «quién cambió qué y cuándo» sin código (`modificado_por` + `FOR SYSTEM_TIME`).

## Migración desde el Prototipo
1. En el Prototipo: Administración › Respaldo JSON.
2. `node tools/migrar-desde-prototipo.js APIH_respaldo_AAAA-MM-DD.json apih_migracion.sql` → informa inválidos (no se migran).
3. Ejecutar `apih_migracion.sql` en la base (una transacción; conserva ids y reinicia secuencias).

## Validación en el ambiente dev de TI
`APIH_SQL_PRUEBAS=si APIH_SQL_SERVER=… APIH_SQL_DB=… node tests/contract/run-azure-sql.js` corre el contrato completo contra la base real.
**Estado:** el script T-SQL no se ha ejecutado aún contra Azure SQL (no hay ambiente disponible); la lógica del almacenamiento se probó con un ejecutor simulado (`tests/contract/sql-simulado.js`). Puntos a confirmar en dev: columnas calculadas persistidas en tablas temporales, permisos de secuencias para la identidad administrada.
