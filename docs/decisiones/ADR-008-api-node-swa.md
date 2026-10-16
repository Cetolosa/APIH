# ADR-008 · API en Node.js con autenticación de Static Web Apps y 3 roles
**Fecha:** 16-10-2026 · **Versión:** C2.0 · **Decidió:** Christian Tolosa (camino «construir y proponer a TI») · **Estado:** Propuesta a TI

**Contexto.** TI exige 3 capas (SPA + Entra ID, API con reglas y validaciones, Azure SQL) y aún no define stack. Se decidió construir y presentar la solución para aprobación.
**Decisión.**
1. API en **Node.js 20** (Azure Functions v4), porque reutiliza `packages/core` ya verificado contra el Prototipo: las reglas existen una sola vez.
2. El enrutador es independiente del hosting: el mismo código corre en Functions, App Service o local.
3. Autenticación delegada en **Azure Static Web Apps + Entra ID**; la API confía solo en `x-ms-client-principal` (la API enlazada no es accesible fuera de SWA). Filtro opcional por dominio.
4. Tres roles por grupos de Entra: Admin, Editor, Lectura. `modificadoPor` siempre desde la identidad.
5. Concurrencia optimista con `version` (`If-Match`/`ETag`); transacciones en operaciones multi-registro.
**Alternativas.** .NET (válida si TI lo exige: solo se reescribe `services/api`, el contrato y sus pruebas siguen sirviendo); validar JWT en la API (necesario solo si la API se expone fuera de SWA).
**Consecuencias.** Los roles finos del Prototipo (Gasto, áreas) quedan para una versión posterior. Sin red al registro npm en la sesión de construcción, el adaptador de Functions se probó con un doble de `@azure/functions`.
