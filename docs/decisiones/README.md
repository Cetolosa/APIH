# Decisiones de arquitectura (ADR)

Una ficha por decisión: contexto, decisión, alternativas, consecuencias. No se borran; si cambian, se marca **Reemplazada por ADR-xxx**.

| ADR | Decisión | Versión | Estado |
| --- | --- | --- | --- |
| [001](ADR-001-versionado-c.md) | Versionado C independiente del Prototipo | C1.0 | Vigente |
| [002](ADR-002-prototipo-congelado-copiar.md) | Prototipo congelado: se copia, no se modifica | C1.0 | Vigente (excepciones: ADR-006, ADR-007) |
| [003](ADR-003-area-lista.md) | `area` siempre es lista | C1.1 | Vigente |
| [004](ADR-004-motivoalta-importacion.md) | Importación exenta de `motivoAlta` | C1.1 | Vigente |
| [005](ADR-005-version-por-componente.md) | Cada componente declara su última versión C | C1.2 | Vigente |
| [006](ADR-006-descongelar-prototipo-fases.md) | Excepción: vista «Fases» en el Prototipo | V22.53 | Vigente |
| [010](ADR-010-infraestructura.md) | Infraestructura como código (SWA + Functions + Azure SQL) | C2.3 | Propuesta a TI |
| [009](ADR-009-azure-sql-documento.md) | Azure SQL: documento JSON + columnas calculadas + tablas temporales | C2.1 | Propuesta a TI |
| [008](ADR-008-api-node-swa.md) | API en Node.js, auth de Static Web Apps y 3 roles | C2.0 | Propuesta a TI |
| [007](ADR-007-planificacion-ficha-y-siguientes-pasos.md) | Excepción: Planificación en la ficha y Siguientes pasos | V22.54 | Vigente |
