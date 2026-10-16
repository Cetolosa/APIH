# ADR-006 · Excepción al congelamiento: vista «Fases» en el Prototipo (V22.53)
**Fecha:** 16-10-2026 · **Versión:** Prototipo V22.53 · **Decidió:** Christian Tolosa · **Estado:** Vigente · **Modifica:** ADR-002

**Contexto.** Al cargar el plan acelerado (C1.3) en APIH no había forma de desplegar y ver las fases del proyecto con sus hitos y riesgos en el tiempo.
**Decisión.** Se descongela el Prototipo **solo para esta mejora de visualización**: nueva vista *Planificación → Fases* con 4 miradas (Gantt por fases, Línea de fases con compuerta, Tablero, Riesgos en el tiempo). Mockup aprobado antes de implementar. No cambia datos, reglas ni el modelo; reutiliza `gates()`, `hitoEstado()`, `nivelRiesgo()`.
**Alternativas.** Esperar al Corporativo (descartada: el plan se necesita ver ahora para gestionarlo).
**Consecuencias.** El Prototipo vuelve a versionarse (V22.53+). Fuera de esta excepción sigue congelado. La lógica de ventanas de fase (`fasesVentana`) se copiará al core del Corporativo junto con las compuertas (C1.4).
