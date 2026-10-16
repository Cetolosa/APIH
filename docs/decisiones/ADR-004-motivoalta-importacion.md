# ADR-004 · Importación exenta de `motivoAlta`
**Fecha:** 15-10-2026 · **Versión:** C1.1 · **Decidió:** Claude, por equivalencia con V22.52 · **Estado:** Vigente

**Contexto.** Crear un Proyecto sin propuesta exige "Motivo de creación directa". La prueba con datos reales (`docs/APIH_iniciativas_con_plan.json`) falló: el importador de V22.52 crea proyectos con `origen: 'importación'` sin ese motivo.
**Decisión.** `motivoAlta` es obligatorio solo si `origen` es `usuario` (o vacío). Regla 7 del contrato.
**Alternativas.** Exigirlo siempre (descartada: rompe importaciones existentes y difiere del Prototipo).
**Consecuencias.** Si se quiere trazabilidad en importaciones, el importador del Corporativo puede rellenar un motivo genérico; queda para revisión con el negocio.
