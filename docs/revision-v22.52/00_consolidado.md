# Revisión integral APIH V22.52 (18-10-2026)

4 revisores independientes (funcional, usabilidad, visual, accesibilidad/seguridad). Total: ~116 hallazgos verificados, 0 críticos. Informes completos en esta carpeta.

## Propuesta de corrección (prototipo congelado: solo lo que protege datos o se ve roto)
| Grupo | Contenido | Hallazgos |
| --- | --- | --- |
| A. Integridad de datos (prioridad 1) | Validar tipos/fechas/enums en Importar iniciativas, Importar respaldo y Completar con IA (solo aplicar lo que la vista previa acepta; riesgo solo al proyecto del archivo; sin duplicados al reimportar). Fase y estado de la ficha de edición pasan por compuertas. Compuerta de Cierre: contar hitos de la fase Cierre y riesgos "En mitigación". NaN de ROI. Neutralizar CSV injection. | F-01–F-07, F-09, F-11, S-03, S-08, S-11, U-01 |
| B. Visual rápido | Selects de filtros con estilo; colores de estado desde tokens (contraste en oscuro); popover Columnas; z-index de panel/popovers; línea suelta de CSS en L588; iconos download/info inexistentes. | V-01–V-05, iconos |
| C. Textos y seguridad de acciones | Erratas ("creadoa", "Proyecto importada", plurales); confirmar eliminar riesgo/hito/decisión/comité y cancelar proyecto; botones de edición deshabilitados para Invitado; unificar Portafolio/Responsable/tú. | U-02–U-04, U-24, tabla de lenguaje |
| D. Accesibilidad de teclado | Calendario y Gantt operables con teclado; roles/etiquetas faltantes. | A-01–A-06 |
| E. Endurecimiento web | CSP connect-src acotado a tu tenant; sanitizador limpiarHTML. | S-06, S-07 |

## Se resuelve en Corporativo (no en el prototipo)
Roles y áreas aplicados en servidor (S-01), concurrencia con versión real (S-02, S-10), autoría de bitácora desde el servidor (S-13), configuración con control de versión (S-09), rendimiento con 600+ iniciativas (S-15).

## Solo puedes comprobar tú en Supabase
1. `select * from pg_policies` en el proyecto: confirmar RLS en todas las tablas y en `perfiles` (el SQL del repo no las contiene, S-05).
2. Authentication → "Confirm email" activado (S-14).
3. Retirar la clave de equipo cuando todos tengan contraseña (S-18).
