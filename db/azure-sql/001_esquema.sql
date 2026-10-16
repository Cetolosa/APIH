/* =====================================================================================
   APIH Corporativo · Azure SQL · C2.1 — esquema inicial
   Modelo: documento JSON validado por la API (packages/core) + columnas calculadas indexables
           + tablas temporales (historial automático de cada cambio) + rowversion para concurrencia.
   Ejecutar una vez sobre una base vacía (idempotente: se puede repetir). ADR-009.
   ===================================================================================== */
IF SCHEMA_ID('apih') IS NULL EXEC('CREATE SCHEMA apih');
GO
/* Correlativos: PROP-001, PRJ-001, HIT-001, RSK-001 */
IF OBJECT_ID('apih.seq_PROP') IS NULL CREATE SEQUENCE apih.seq_PROP AS INT START WITH 1 INCREMENT BY 1;
IF OBJECT_ID('apih.seq_PRJ')  IS NULL CREATE SEQUENCE apih.seq_PRJ  AS INT START WITH 1 INCREMENT BY 1;
IF OBJECT_ID('apih.seq_HIT')  IS NULL CREATE SEQUENCE apih.seq_HIT  AS INT START WITH 1 INCREMENT BY 1;
IF OBJECT_ID('apih.seq_RSK')  IS NULL CREATE SEQUENCE apih.seq_RSK  AS INT START WITH 1 INCREMENT BY 1;
GO
/* ---------- Iniciativas (propuestas y proyectos) ---------- */
IF OBJECT_ID('apih.iniciativas') IS NULL
CREATE TABLE apih.iniciativas (
  id             VARCHAR(20)    NOT NULL CONSTRAINT pk_iniciativas PRIMARY KEY,
  doc            NVARCHAR(MAX)  NOT NULL CONSTRAINT ck_iniciativas_json CHECK (ISJSON(doc) = 1),
  ver            ROWVERSION     NOT NULL,
  modificado_por NVARCHAR(256)  NOT NULL,
  -- columnas calculadas (persistidas e indexables) para filtros, reportes y Power BI
  tipo        AS CAST(JSON_VALUE(doc, '$.tipo')       AS NVARCHAR(20))  PERSISTED,
  titulo      AS CAST(JSON_VALUE(doc, '$.titulo')     AS NVARCHAR(200)) PERSISTED,
  fase        AS CAST(JSON_VALUE(doc, '$.fase')       AS NVARCHAR(40))  PERSISTED,
  estado      AS CAST(JSON_VALUE(doc, '$.estado')     AS NVARCHAR(40))  PERSISTED,
  rag         AS CAST(JSON_VALUE(doc, '$.rag')        AS NVARCHAR(10))  PERSISTED,
  lider       AS CAST(JSON_VALUE(doc, '$.lider')      AS NVARCHAR(256)) PERSISTED,
  inicio_plan AS CAST(JSON_VALUE(doc, '$.inicioPlan') AS NVARCHAR(10))  PERSISTED,
  fin_plan    AS CAST(JSON_VALUE(doc, '$.finPlan')    AS NVARCHAR(10))  PERSISTED,
  valido_desde DATETIME2(3) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
  valido_hasta DATETIME2(3) GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
  PERIOD FOR SYSTEM_TIME (valido_desde, valido_hasta),
  CONSTRAINT ck_iniciativas_id CHECK (id LIKE 'PROP-%' OR id LIKE 'PRJ-%')
) WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = apih.iniciativas_historial));
GO
/* ---------- Hitos ---------- */
IF OBJECT_ID('apih.hitos') IS NULL
CREATE TABLE apih.hitos (
  id             VARCHAR(20)    NOT NULL CONSTRAINT pk_hitos PRIMARY KEY,
  doc            NVARCHAR(MAX)  NOT NULL CONSTRAINT ck_hitos_json CHECK (ISJSON(doc) = 1),
  ver            ROWVERSION     NOT NULL,
  modificado_por NVARCHAR(256)  NOT NULL,
  ini        AS CAST(JSON_VALUE(doc, '$.ini')    AS VARCHAR(20))   PERSISTED,
  nombre     AS CAST(JSON_VALUE(doc, '$.nombre') AS NVARCHAR(200)) PERSISTED,
  fase       AS CAST(JSON_VALUE(doc, '$.fase')   AS NVARCHAR(40))  PERSISTED,
  fecha      AS CAST(JSON_VALUE(doc, '$.fecha')  AS NVARCHAR(10))  PERSISTED,
  completado AS CAST(CASE JSON_VALUE(doc, '$.completado') WHEN 'true' THEN 1 ELSE 0 END AS BIT) PERSISTED,
  valido_desde DATETIME2(3) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
  valido_hasta DATETIME2(3) GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
  PERIOD FOR SYSTEM_TIME (valido_desde, valido_hasta)
) WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = apih.hitos_historial));
GO
/* ---------- Riesgos ---------- */
IF OBJECT_ID('apih.riesgos') IS NULL
CREATE TABLE apih.riesgos (
  id             VARCHAR(20)    NOT NULL CONSTRAINT pk_riesgos PRIMARY KEY,
  doc            NVARCHAR(MAX)  NOT NULL CONSTRAINT ck_riesgos_json CHECK (ISJSON(doc) = 1),
  ver            ROWVERSION     NOT NULL,
  modificado_por NVARCHAR(256)  NOT NULL,
  ini    AS CAST(JSON_VALUE(doc, '$.ini')    AS VARCHAR(20))  PERSISTED,
  estado AS CAST(JSON_VALUE(doc, '$.estado') AS NVARCHAR(20)) PERSISTED,
  prob   AS CAST(JSON_VALUE(doc, '$.prob')   AS TINYINT)      PERSISTED,
  imp    AS CAST(JSON_VALUE(doc, '$.imp')    AS TINYINT)      PERSISTED,
  f_rev  AS CAST(JSON_VALUE(doc, '$.fRev')   AS NVARCHAR(10)) PERSISTED,
  valido_desde DATETIME2(3) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
  valido_hasta DATETIME2(3) GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
  PERIOD FOR SYSTEM_TIME (valido_desde, valido_hasta)
) WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = apih.riesgos_historial));
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_iniciativas_tipo_fase') CREATE INDEX ix_iniciativas_tipo_fase ON apih.iniciativas (tipo, fase, estado);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_hitos_ini')           CREATE INDEX ix_hitos_ini   ON apih.hitos (ini, fecha);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_riesgos_ini')         CREATE INDEX ix_riesgos_ini ON apih.riesgos (ini, estado);
GO
/* ---------- Vistas de reporte (Power BI / consultas de TI) ---------- */
CREATE OR ALTER VIEW apih.vw_iniciativas AS
SELECT i.id, i.tipo, i.titulo, i.fase, i.estado, i.rag, i.lider,
       TRY_CONVERT(date, i.inicio_plan) AS inicio_plan, TRY_CONVERT(date, i.fin_plan) AS fin_plan,
       TRY_CONVERT(date, JSON_VALUE(i.doc, '$.finEst')) AS fin_estimado,
       TRY_CONVERT(decimal(9,2), JSON_VALUE(i.doc, '$.avance')) AS avance,
       JSON_VALUE(i.doc, '$.moneda') AS moneda,
       TRY_CONVERT(decimal(18,2), JSON_VALUE(i.doc, '$.presupuesto')) AS presupuesto,
       TRY_CONVERT(decimal(18,2), JSON_VALUE(i.doc, '$.gastado')) AS gastado,
       TRY_CONVERT(decimal(18,2), JSON_VALUE(i.doc, '$.beneficio')) AS beneficio,
       JSON_VALUE(i.doc, '$.sponsor') AS sponsor, JSON_VALUE(i.doc, '$.prioridad') AS prioridad,
       i.modificado_por
FROM apih.iniciativas i;
GO
CREATE OR ALTER VIEW apih.vw_iniciativa_area AS
SELECT i.id, a.value AS area FROM apih.iniciativas i CROSS APPLY OPENJSON(i.doc, '$.area') a;
GO
CREATE OR ALTER VIEW apih.vw_hitos AS
SELECT h.id, h.ini, h.nombre, h.fase, TRY_CONVERT(date, h.fecha) AS fecha, h.completado,
       TRY_CONVERT(date, JSON_VALUE(h.doc, '$.fechaReal')) AS fecha_real, JSON_VALUE(h.doc, '$.resp') AS responsable
FROM apih.hitos h;
GO
CREATE OR ALTER VIEW apih.vw_riesgos AS
SELECT r.id, r.ini, JSON_VALUE(r.doc, '$.desc') AS descripcion, JSON_VALUE(r.doc, '$.cat') AS categoria, r.estado,
       r.prob, r.imp, r.prob * r.imp AS exposicion, TRY_CONVERT(date, r.f_rev) AS fecha_revision,
       JSON_VALUE(r.doc, '$.dueno') AS dueno, JSON_VALUE(r.doc, '$.mit') AS mitigacion
FROM apih.riesgos r;
GO
