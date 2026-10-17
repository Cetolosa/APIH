# ADR-013 · Versión final: propuestas como proyectos, Planificación con propuestas y categorías (V22.56)
**Fecha:** 17-10-2026 · **Versión:** Prototipo V22.56 (luego Corporativo) · **Decidió:** Christian Tolosa · **Estado:** Vigente · **Modifica:** ADR-002

**Contexto.** Pedido del 16-10 para la versión final: las propuestas no tenían Planificación ni Hitos en la ficha, el menú Planificación mostraba solo proyectos (Gantt, Roadmap) y los hitos no tenían categoría.
**Decisión.** Se hace primero en el Prototipo y se traspasa al Corporativo junto con las subfases (ADR-012).
1. **Ficha de propuesta = ficha de proyecto:** secciones Planificación (fases con fechas, cronograma con hitos y riesgos, próximos 14 días, siguientes pasos) e Hitos; el resumen se reparte en Cifras/Salud/Logros igual que en proyectos. Sin fechas tentativas, la ficha pide definirlas en vez del cronograma.
2. **Planificación con propuestas:** selector **Proyectos · Propuestas · Ambos** (por navegador, por defecto Ambos) en Gantt, Roadmap, Fases, Hitos y Riesgos.
3. **Categorías:** hito con `cat` (lista `HITO_CATS`, configurable en `St.cfg.hitoCats`); riesgo ya tenía `cat` (`RISK_CATS`). Filtro por categoría en la vista Hitos (nuevo) y Riesgos (existente), y chips de categoría en las secciones Hitos y Riesgos de la ficha (proyectos y propuestas).
**Traspaso.** 17-10-2026: llevado al Corporativo en **C2.11** junto con las subfases; reglas en el core y validadas por la API.
**Pendiente.** Editor de listas de categorías en Administración; Calendario y Capacidad no usan el selector de tipo.
