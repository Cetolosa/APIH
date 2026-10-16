# ADR-007 · Excepción: Planificación en la ficha y Siguientes pasos (V22.54)
**Fecha:** 16-10-2026 · **Versión:** Prototipo V22.54 · **Decidió:** Christian Tolosa · **Estado:** Vigente · **Modifica:** ADR-002

**Contexto.** La ficha del proyecto no mostraba la planificación y ni la ficha ni Mi cocina orientaban sobre qué hacer después.
**Decisión.** Segunda excepción al congelamiento, con mockup aprobado: (1) pestaña **Planificación** en la ficha (fases, cronograma por fase, próximos 14 días); (2) **Siguientes pasos** en la ficha y en **Mi cocina** (todos mis proyectos activos, 5 primeros, filtro por proyecto, «Posponer» hasta mañana).
**Motor (`pasosDe`)**: reglas fijas y explicables, sin IA. Prioridad: vencido u hoy → lo que apaga un tenedor → condiciones de la siguiente compuerta → revisiones de riesgo ≤ 7 d o crítico sin mitigación → hitos y compromisos ≤ 7 d. Cada paso dice por qué aparece y qué protege.
**Alternativas.** Sugerencias generadas por IA (descartada por ahora: no son auditables ni deterministas).
**Consecuencias.** «Posponer» se guarda solo en el navegador (localStorage). `pasosDe` se copiará al core del Corporativo junto con las compuertas.
