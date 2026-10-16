# ADR-009 · Azure SQL: documento JSON + columnas calculadas + tablas temporales
**Fecha:** 16-10-2026 · **Versión:** C2.1 · **Decidió:** Claude (propuesta) · **Estado:** Propuesta a TI

**Contexto.** La iniciativa tiene ~58 campos y seguirá creciendo (funciones diferidas). Las reglas ya viven en la API/core. Se necesita trazabilidad, concurrencia y reportes.
**Decisión.** Cada tabla guarda el objeto validado en `doc` (JSON) + columnas calculadas persistidas e indexadas para lo que se filtra o reporta; `rowversion` para concurrencia; `SYSTEM_VERSIONING` para historial; vistas `vw_*` relacionales para Power BI. Acceso de la API con identidad administrada (sin contraseñas).
**Alternativas.** Modelo totalmente normalizado (más DDL y mapeo, migraciones en cada campo nuevo; se puede derivar después desde las vistas); seguir en Supabase (descartado por TI).
**Consecuencias.** Agregar un campo no requiere cambiar la base. Filtros complejos se resuelven hoy en la API (volumen: cientos de registros); si crece, se agregan columnas calculadas. Pendiente validar el DDL en el ambiente dev.
