# ADR-003 · `area` siempre es lista
**Fecha:** 15-10-2026 · **Versión:** C1.1 · **Decidió:** Claude (propuesta), aceptada · **Estado:** Vigente

**Contexto.** En V22.52 `area` a veces es texto con comas (`"BISE,Operaciones"`) y a veces lista; el código convierte en cada uso.
**Decisión.** En el contrato `area` es `string[]` con al menos un elemento (por defecto `["BISE"]`).
**Alternativas.** Mantener texto (descartada: complica filtros y SQL); aceptar ambos (descartada: traslada la ambigüedad al backend).
**Consecuencias.** La migración Prototipo → Corporativo convierte con `split(',')` (ya aplicado en `tests/contract/run.js`). En Azure SQL: tabla relacionada iniciativa–área.
