# ADR-001 · Versionado C independiente del Prototipo
**Fecha:** 15-10-2026 · **Versión:** C1.0 · **Decidió:** Christian Tolosa · **Estado:** Vigente

**Contexto.** El Prototipo usa V22.x y está congelado en V22.52. El Corporativo nace en el mismo repo; usar V22.53+ mezclaría ambos productos.
**Decisión.** El Corporativo se versiona **C<n>.<m>** desde C1.0. Todo lo del Corporativo (código, contratos, pruebas, registro, ramas, commits, tags) lleva su versión C.
**Alternativas.** Continuar V22.x (descartada: confunde qué está en producción); semver 1.0.0 (descartada: no distingue el producto a simple vista).
**Consecuencias.** `n` sube con hitos mayores (p. ej. primer despliegue en Azure); `m` con cada entrega. Ver [CHANGELOG](../../CHANGELOG.md).
