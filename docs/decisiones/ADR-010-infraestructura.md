# ADR-010 · Infraestructura: SWA Standard + Function App enlazada + Azure SQL serverless, como código
**Fecha:** 16-10-2026 · **Versión:** C2.3 · **Decidió:** Claude (propuesta) · **Estado:** Propuesta a TI

**Contexto.** TI pidió hosting en Azure Static Web App, registro en Entra ID con asignación requerida, Azure SQL, ambientes y pipeline.
**Decisión.** Bicep para todos los recursos; Function App propia (no las «managed functions» de SWA) porque permite **identidad administrada** hacia Azure SQL sin contraseñas; Azure SQL solo con Entra ID; roles por grupos vía `rolesSource`; pipeline con pruebas obligatorias y OIDC.
**Alternativas.** API administrada por SWA (más simple, pero exige cadena de conexión con secreto); App Service (más costo fijo); Terraform (válido si es el estándar de TI).
**Consecuencias.** Un despliegue por ambiente en ~1 hora de TI. Red privada y pentest quedan como pendientes de producción (docs/seguridad.md).
