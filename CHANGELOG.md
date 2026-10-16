# Registro de cambios — APIH Corporativo

Versiones **C<n>.<m>**. El Prototipo queda congelado en **V22.52** y no aparece aquí (ver [ADR-001](docs/decisiones/ADR-001-versionado-c.md)).
Cada componente declara la última versión C en que cambió ([ADR-005](docs/decisiones/ADR-005-version-por-componente.md)).

| Versión | Fecha | Rama · commit | Cambio | Componentes |
| --- | --- | --- | --- | --- |
| C2.1 | 16-10-2026 | `c2.1-azure-sql` | Azure SQL: esquema (documento + columnas calculadas + tablas temporales + vistas), permisos con identidad administrada, `store-mssql.js`, migración desde el respaldo del Prototipo. Contrato en verde contra la lógica SQL (ejecutor simulado); script para validarlo en la base real. ADR-009. | db/azure-sql C2.1, services/api C2.1, tools C2.1 |
| C2.0 | 16-10-2026 | `c2.0-api` | API en Node.js: servicio con todas las reglas en servidor (iniciativas, hitos, riesgos, compuertas, roles), enrutador REST con `If-Match`/`ETag`, auth Static Web Apps + Entra ID, adaptador Azure Functions, servidor local. 15 casos de contrato × 2 (servicio y HTTP) + 7 de seguridad. ADR-008. | services/api C2.0, tests/contract C2.0 |
| C1.4 | 16-10-2026 | `c1.4-core-hitos-riesgos` | Core: `gates`, `fasesVentana`, `hitoEstado`, `riesgoSinMit`, `validarHito`, `validarRiesgo` (equivalencia con V22.54: 62.061 casos). Contratos `hito.schema.json`, `riesgo.schema.json`, `hitos-riesgos.md`. | core C1.4, contracts C1.4, tests |
| C1.3 | 16-10-2026 | `c1.3-replan-acelerado` | Replanificación acelerada de APIH Corporativo: 21 hitos (producción 27-11, antes 22-12), 9 riesgos con fecha de revisión. Archivo importable `docs/APIH_Corporativo_plan_acelerado_C1.3.json`. | docs |
| C1.2 | 15-10-2026 | `c1.2-documentacion` · 47de47c | Documentación del proceso: este registro, decisiones (ADR-001…005), traspaso actualizado, tags por versión. | docs |
| C1.1 | 15-10-2026 | `c1.1-contrato-iniciativa` · 3008881 | Contrato de Iniciativa: esquema (58 campos), 8 operaciones, 10 reglas, errores, REST sugerido; validador en core; 12 pruebas de contrato + adaptador en memoria. | core C1.1, contracts C1.1, tests/contract C1.1 |
| C1.0 | 15-10-2026 | `c1.0-core-fechas-riesgo` · b296da5 | `packages/core`: fechas y riesgo copiados de V22.52; prueba de equivalencia (68.256 casos). | core C1.0, tests/unit C1.0 |

## Cómo se documenta cada versión
1. Rama `c<n>.<m>-<tema>` → pruebas → merge a `main` → push → tag `c<n>.<m>`.
2. Una fila en este registro y, si cambió el core, en `packages/core/README.md`.
3. Toda decisión de diseño no obvia → ficha en `docs/decisiones/` (ADR).
4. Commit con prefijo `C<n>.<m>:` y la frase "Prototipo (index.html V22.52) sin cambios".
5. Al cierre de la sesión: actualizar `docs/HANDOFF.md` y su copia en el proyecto de claude.ai.
