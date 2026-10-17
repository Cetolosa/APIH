# ADR-014 · Prototipo congelado nuevamente en V22.60
**Fecha:** 17-10-2026 · **Decidió:** Christian Tolosa · **Estado:** Vigente · **Cierra:** las excepciones ADR-012 y ADR-013

**Contexto.** El Prototipo se abrió para subfases (V22.55) y la versión final funcional (V22.56–V22.59). Todo quedó traspasado y probado en el Corporativo (C2.11–C2.16) y pasó la revisión de seguridad del 17-10 (`docs/revision-seguridad-2026-10-17.md`).
**Decisión.** El Prototipo queda **congelado en V22.60** (V22.59 + correcciones de la revisión de seguridad). Vuelve a regir ADR-002: nada se cambia en el Prototipo; lo nuevo se hace en el Corporativo (versión C). Una nueva excepción requiere pedido explícito del usuario y su ADR.
**Consecuencias.** El flujo «Prototipo primero → traspaso» queda suspendido; los cambios van directo a `apps/corporativo` con `correr-corporativo.sh`. El Prototipo sigue en uso por Sistemas BISE hasta la migración y su retiro (03-12).
