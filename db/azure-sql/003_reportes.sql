/* APIH Corporativo · Azure SQL · C2.10 — Vistas de reporte para Power BI (esquema rpt, modelo estrella).
   Solo lectura sobre apih.*: no cambia tablas ni la API. Idempotente (CREATE OR ALTER).
   Fechas del negocio en hora de Chile ('Pacific SA Standard Time'). Reglas iguales a packages/core:
     estado de hito = hitoEstado(), nivel de riesgo = nivelRiesgo() con el umbral crítico de la configuración (por defecto 15).
   Clasificación (docs/operacion/clasificacion-datos.md): los montos van SOLO en rpt.fact_finanzas (Confidencial),
   con un rol de lectura aparte. */
IF SCHEMA_ID('rpt') IS NULL EXEC('CREATE SCHEMA rpt');
GO
/* Fecha de hoy en Chile y umbral crítico configurado (APIH_Config/cfg; si está en trozos o no existe → 15) */
CREATE OR ALTER VIEW rpt.parametros AS
SELECT CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Pacific SA Standard Time' AS date) AS hoy,
       COALESCE((SELECT TRY_CONVERT(int, JSON_VALUE(
                   CASE WHEN JSON_VALUE(c.datos, '$.__chunks') IS NULL THEN c.datos
                        ELSE (SELECT STRING_AGG(CAST(x.datos AS NVARCHAR(MAX)), '') WITHIN GROUP (ORDER BY TRY_CONVERT(int, SUBSTRING(x.id, 5, 10)))
                              FROM apih.registros x WHERE x.lista = 'APIH_Config' AND x.id LIKE 'cfg#%') END, '$.umbralCritico'))
                 FROM apih.registros c WHERE c.lista = 'APIH_Config' AND c.id = 'cfg'), 15) AS umbral_critico;
/* Nota: la SPA permite que cada líder ajuste su umbral (cfgI); el reporte usa el de la organización. */
GO
/* ---------- Dimensión iniciativa (sin montos) ---------- */
CREATE OR ALTER VIEW rpt.dim_iniciativa AS
SELECT i.id, i.tipo, i.titulo, i.fase, i.estado, i.rag, i.lider,
       JSON_VALUE(i.doc, '$.sponsor')   AS sponsor,
       JSON_VALUE(i.doc, '$.negocio')   AS negocio,
       JSON_VALUE(i.doc, '$.prioridad') AS prioridad,
       JSON_VALUE(i.doc, '$.categoria') AS categoria,
       JSON_VALUE(i.doc, '$.tipoIni')   AS tipo_iniciativa,
       JSON_VALUE(i.doc, '$.origen')    AS origen,
       JSON_VALUE(i.doc, '$.propuestaOrigen') AS propuesta_origen,
       TRY_CONVERT(date, JSON_VALUE(i.doc, '$.creada'))     AS creada,
       TRY_CONVERT(date, JSON_VALUE(i.doc, '$.faseDesde'))  AS fase_desde,
       TRY_CONVERT(date, i.inicio_plan)                     AS inicio_plan,
       TRY_CONVERT(date, i.fin_plan)                        AS fin_plan,
       TRY_CONVERT(date, JSON_VALUE(i.doc, '$.finEst'))     AS fin_estimado,
       TRY_CONVERT(date, JSON_VALUE(i.doc, '$.inicioReal')) AS inicio_real,
       TRY_CONVERT(date, JSON_VALUE(i.doc, '$.finReal'))    AS fin_real,
       TRY_CONVERT(decimal(9,2), JSON_VALUE(i.doc, '$.avance')) AS avance,
       TRY_CONVERT(decimal(9,2), JSON_VALUE(i.doc, '$.score'))  AS score,
       TRY_CONVERT(date, JSON_VALUE(i.doc, '$.actualizada')) AS actualizada,
       DATEDIFF(day, TRY_CONVERT(date, JSON_VALUE(i.doc, '$.actualizada')), p.hoy) AS dias_sin_actualizar,
       DATEDIFF(day, TRY_CONVERT(date, JSON_VALUE(i.doc, '$.faseDesde')), p.hoy)  AS dias_en_fase,
       CASE WHEN i.estado IN ('Aprobada', 'Rechazada', 'Retirada', 'Completado', 'Cancelado') THEN 0 ELSE 1 END AS vigente,
       (SELECT TOP 1 a.value FROM OPENJSON(i.doc, '$.area') a ORDER BY CAST(a.[key] AS int)) AS area_principal
FROM apih.iniciativas i CROSS JOIN rpt.parametros p;
GO
/* Puente iniciativa ↔ área (una iniciativa puede tener varias áreas) */
CREATE OR ALTER VIEW rpt.puente_area AS
SELECT i.id AS ini, LTRIM(RTRIM(a.value)) AS area FROM apih.iniciativas i CROSS APPLY OPENJSON(i.doc, '$.area') a;
GO
/* ---------- Hechos ---------- */
/* Historial de avance (doc.hist = [[fecha, avance], …]; se conserva al migrar desde el Prototipo) */
CREATE OR ALTER VIEW rpt.fact_avance AS
SELECT i.id AS ini, TRY_CONVERT(date, JSON_VALUE(h.value, '$[0]')) AS fecha, TRY_CONVERT(decimal(9,2), JSON_VALUE(h.value, '$[1]')) AS avance
FROM apih.iniciativas i CROSS APPLY OPENJSON(i.doc, '$.hist') h
WHERE TRY_CONVERT(date, JSON_VALUE(h.value, '$[0]')) IS NOT NULL;
GO
/* Fases y estados en el tiempo, desde el historial automático (tablas temporales): un tramo por cada cambio de fase, estado o RAG */
CREATE OR ALTER VIEW rpt.fact_tramos AS
WITH v AS (
  SELECT id, fase, estado, rag, valido_desde, valido_hasta,
         LAG(fase)   OVER (PARTITION BY id ORDER BY valido_desde) AS fase_ant,
         LAG(estado) OVER (PARTITION BY id ORDER BY valido_desde) AS estado_ant,
         LAG(rag)    OVER (PARTITION BY id ORDER BY valido_desde) AS rag_ant
  FROM apih.iniciativas FOR SYSTEM_TIME ALL
), c AS (
  SELECT id, fase, estado, rag, valido_desde,
         LEAD(valido_desde) OVER (PARTITION BY id ORDER BY valido_desde) AS siguiente
  FROM v
  WHERE fase_ant IS NULL OR fase <> fase_ant OR ISNULL(estado, '') <> ISNULL(estado_ant, '') OR ISNULL(rag, '') <> ISNULL(rag_ant, '')
)
SELECT id AS ini, fase, estado, rag,
       CAST(CAST(valido_desde AS datetimeoffset) AT TIME ZONE 'Pacific SA Standard Time' AS date) AS desde,
       CAST(CAST(siguiente    AS datetimeoffset) AT TIME ZONE 'Pacific SA Standard Time' AS date) AS hasta,
       DATEDIFF(day, valido_desde, ISNULL(siguiente, SYSUTCDATETIME())) AS dias
FROM c;
GO
/* Hitos con el estado de packages/core hitoEstado(): done, late, over, soon (≤ 7 días), ok */
CREATE OR ALTER VIEW rpt.fact_hitos AS
SELECT h.id, h.ini, h.nombre, h.fase, TRY_CONVERT(date, h.fecha) AS fecha, h.completado,
       TRY_CONVERT(date, JSON_VALUE(h.doc, '$.fechaReal')) AS fecha_real, JSON_VALUE(h.doc, '$.resp') AS responsable,
       CASE WHEN h.completado = 1 AND JSON_VALUE(h.doc, '$.fechaReal') > h.fecha THEN 'Completado con retraso'
            WHEN h.completado = 1 THEN 'Completado'
            WHEN DATEDIFF(day, p.hoy, TRY_CONVERT(date, h.fecha)) < 0 THEN 'Vencido'
            WHEN DATEDIFF(day, p.hoy, TRY_CONVERT(date, h.fecha)) <= 7 THEN 'Por vencer'
            ELSE 'En plazo' END AS estado,
       CASE WHEN h.completado = 0 THEN DATEDIFF(day, p.hoy, TRY_CONVERT(date, h.fecha)) END AS dias_al_vencimiento
FROM apih.hitos h CROSS JOIN rpt.parametros p;
GO
/* Riesgos con el nivel de packages/core nivelRiesgo(): Crítico ≥ umbral, Alto ≥ 10, Medio ≥ 5, Bajo */
CREATE OR ALTER VIEW rpt.fact_riesgos AS
SELECT r.id, r.ini, JSON_VALUE(r.doc, '$.desc') AS descripcion, JSON_VALUE(r.doc, '$.cat') AS categoria, r.estado,
       r.prob, r.imp, r.prob * r.imp AS exposicion,
       CASE WHEN r.prob * r.imp >= p.umbral_critico THEN 'Crítico' WHEN r.prob * r.imp >= 10 THEN 'Alto' WHEN r.prob * r.imp >= 5 THEN 'Medio' ELSE 'Bajo' END AS nivel,
       CASE WHEN r.estado = 'Cerrado' THEN 0 ELSE 1 END AS abierto,
       CASE WHEN r.estado <> 'Cerrado' AND NULLIF(LTRIM(RTRIM(ISNULL(JSON_VALUE(r.doc, '$.mit'), ''))), '') IS NULL THEN 1 ELSE 0 END AS sin_mitigacion,
       TRY_CONVERT(date, JSON_VALUE(r.doc, '$.fIdent')) AS fecha_identificacion, TRY_CONVERT(date, r.f_rev) AS fecha_revision,
       JSON_VALUE(r.doc, '$.dueno') AS dueno, JSON_VALUE(r.doc, '$.mit') AS mitigacion
FROM apih.riesgos r CROSS JOIN rpt.parametros p;
GO
/* Gobierno (colecciones guardadas como registros JSON) */
CREATE OR ALTER VIEW rpt.fact_decisiones AS
SELECT r.id, JSON_VALUE(r.datos, '$.ini') AS ini, JSON_VALUE(r.datos, '$.tipo') AS tipo, JSON_VALUE(r.datos, '$.titulo') AS titulo,
       JSON_VALUE(r.datos, '$.estado') AS estado, TRY_CONVERT(date, JSON_VALUE(r.datos, '$.fecha')) AS fecha,
       TRY_CONVERT(date, JSON_VALUE(r.datos, '$.limite')) AS limite, JSON_VALUE(r.datos, '$.solicita') AS solicita,
       CASE WHEN JSON_VALUE(r.datos, '$.estado') = 'Pendiente' AND TRY_CONVERT(date, JSON_VALUE(r.datos, '$.limite')) < p.hoy THEN 1 ELSE 0 END AS vencida
FROM apih.registros r CROSS JOIN rpt.parametros p WHERE r.lista = 'APIH_Decisiones' AND ISJSON(r.datos) = 1;
GO
CREATE OR ALTER VIEW rpt.fact_compromisos AS
SELECT r.id, JSON_VALUE(r.datos, '$.ini') AS ini, JSON_VALUE(r.datos, '$.texto') AS texto, JSON_VALUE(r.datos, '$.resp') AS responsable,
       JSON_VALUE(r.datos, '$.estado') AS estado, TRY_CONVERT(date, JSON_VALUE(r.datos, '$.limite')) AS limite,
       CASE WHEN JSON_VALUE(r.datos, '$.estado') = 'Abierto' AND TRY_CONVERT(date, JSON_VALUE(r.datos, '$.limite')) < p.hoy THEN 1 ELSE 0 END AS vencido
FROM apih.registros r CROSS JOIN rpt.parametros p WHERE r.lista = 'APIH_Compromisos' AND ISJSON(r.datos) = 1;
GO
CREATE OR ALTER VIEW rpt.fact_cambios AS
SELECT r.id, JSON_VALUE(r.datos, '$.ini') AS ini, JSON_VALUE(r.datos, '$.tipo') AS tipo, JSON_VALUE(r.datos, '$.estado') AS estado,
       JSON_VALUE(r.datos, '$.desc') AS descripcion, JSON_VALUE(r.datos, '$.solicita') AS solicita, JSON_VALUE(r.datos, '$.aprobador') AS aprobador,
       TRY_CONVERT(date, JSON_VALUE(r.datos, '$.creada')) AS creada, TRY_CONVERT(date, JSON_VALUE(r.datos, '$.fDec')) AS fecha_decision,
       DATEDIFF(day, TRY_CONVERT(date, JSON_VALUE(r.datos, '$.creada')), TRY_CONVERT(date, JSON_VALUE(r.datos, '$.fDec'))) AS dias_resolucion
FROM apih.registros r WHERE r.lista = 'APIH_Cambios' AND ISJSON(r.datos) = 1;
GO
/* ---------- Confidencial: montos ---------- */
CREATE OR ALTER VIEW rpt.fact_finanzas AS
SELECT i.id AS ini, JSON_VALUE(i.doc, '$.moneda') AS moneda,
       TRY_CONVERT(decimal(18,2), JSON_VALUE(i.doc, '$.presupuesto')) AS presupuesto,
       TRY_CONVERT(decimal(18,2), JSON_VALUE(i.doc, '$.gastado'))     AS gastado,
       TRY_CONVERT(decimal(18,2), JSON_VALUE(i.doc, '$.beneficio'))   AS beneficio,
       TRY_CONVERT(decimal(18,2), JSON_VALUE(i.doc, '$.ahorroReal'))  AS ahorro_real
FROM apih.iniciativas i;
GO
/* ---------- Permisos (ejecutar como administrador Entra de la base; grupos creados por TI) ----------
   APIH-Reportes: todo rpt salvo montos. APIH-Reportes-Finanzas: además rpt.fact_finanzas.
   Se otorga vista por vista (sin DENY) para que una persona en ambos grupos vea los montos. Las vistas leen apih.* por
   encadenamiento de propiedad (mismo dueño dbo): los grupos NO necesitan permisos sobre apih. */
-- CREATE USER [APIH-Reportes] FROM EXTERNAL PROVIDER;
-- GRANT SELECT ON rpt.parametros TO [APIH-Reportes];      GRANT SELECT ON rpt.dim_iniciativa TO [APIH-Reportes];
-- GRANT SELECT ON rpt.puente_area TO [APIH-Reportes];     GRANT SELECT ON rpt.fact_avance TO [APIH-Reportes];
-- GRANT SELECT ON rpt.fact_tramos TO [APIH-Reportes];     GRANT SELECT ON rpt.fact_hitos TO [APIH-Reportes];
-- GRANT SELECT ON rpt.fact_riesgos TO [APIH-Reportes];    GRANT SELECT ON rpt.fact_decisiones TO [APIH-Reportes];
-- GRANT SELECT ON rpt.fact_compromisos TO [APIH-Reportes]; GRANT SELECT ON rpt.fact_cambios TO [APIH-Reportes];
-- CREATE USER [APIH-Reportes-Finanzas] FROM EXTERNAL PROVIDER;
-- GRANT SELECT ON rpt.fact_finanzas TO [APIH-Reportes-Finanzas];
