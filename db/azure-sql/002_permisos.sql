/* APIH Corporativo · Azure SQL · C2.1 — acceso de la API con identidad administrada (sin contraseñas).
   Reemplazar <nombre-de-la-function-app> por el nombre del recurso. Ejecutar como administrador Entra de la base. */
CREATE USER [<nombre-de-la-function-app>] FROM EXTERNAL PROVIDER;
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::apih TO [<nombre-de-la-function-app>];
GRANT UPDATE ON SEQUENCE::apih.seq_PROP TO [<nombre-de-la-function-app>];
GRANT UPDATE ON SEQUENCE::apih.seq_PRJ  TO [<nombre-de-la-function-app>];
GRANT UPDATE ON SEQUENCE::apih.seq_HIT  TO [<nombre-de-la-function-app>];
GRANT UPDATE ON SEQUENCE::apih.seq_RSK  TO [<nombre-de-la-function-app>];
/* Lectura para reportes (opcional): un grupo de Entra con acceso solo a las vistas */
-- CREATE USER [APIH-Reportes] FROM EXTERNAL PROVIDER;
-- GRANT SELECT ON apih.vw_iniciativas TO [APIH-Reportes]; GRANT SELECT ON apih.vw_iniciativa_area TO [APIH-Reportes];
-- GRANT SELECT ON apih.vw_hitos TO [APIH-Reportes];       GRANT SELECT ON apih.vw_riesgos TO [APIH-Reportes];
