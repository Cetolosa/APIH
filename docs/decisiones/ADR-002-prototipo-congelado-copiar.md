# ADR-002 · Prototipo congelado: se copia, no se modifica
**Fecha:** 15-10-2026 · **Versión:** C1.0 · **Decidió:** Christian Tolosa · **Estado:** Vigente

**Contexto.** El traspaso proponía que `index.html` consumiera `packages/core`. Eso sería una refactorización del Prototipo congelado y agrega riesgo de que no arranque.
**Decisión.** `index.html` (V22.52) **no se toca** salvo correcciones críticas y accesos. Lo que el Corporativo necesite se **copia** y continúa con versión C.
**Alternativas.** Que el Prototipo use el core (descartada: rompe el congelamiento).
**Consecuencias.** Hay código duplicado mientras ambos convivan. La fidelidad se garantiza con pruebas de equivalencia que leen `index.html` en modo solo lectura (`tests/unit/core-equivalencia.js`). Al retirarse el Prototipo, la duplicación desaparece.
