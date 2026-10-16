# ADR-005 · Cada componente declara su última versión C
**Fecha:** 15-10-2026 · **Versión:** C1.2 · **Decidió:** Claude (propuesta) · **Estado:** Vigente

**Contexto.** No todas las entregas cambian todo (C1.2 es solo documentación). Subir la versión del core sin cambios haría creer que cambió su lógica.
**Decisión.** La **versión del producto** es la última fila del CHANGELOG. Cada componente (`APIHCore.VERSION`, `$id` del esquema, pruebas) declara la versión C en que **cambió por última vez**. El CHANGELOG lista qué componentes cambiaron en cada versión.
**Alternativas.** Una sola versión para todo (descartada: obliga a subir versiones sin cambios y hace ruidoso el historial).
**Consecuencias.** `tests/contract/run.js` verifica que el esquema y el core declaren la misma versión, porque deben cambiar juntos.
