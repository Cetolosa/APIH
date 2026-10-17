# Revisión de seguridad · Prototipo V22.60 y Corporativo C2.16 (17-10-2026)

**Alcance:** todo lo agregado desde la propuesta enviada a TI (Prototipo V22.55–V22.59, Corporativo C2.11–C2.15): subfases, fechas de fase, propuestas en las mismas vistas que proyectos, categorías, filtro de tipo, importar y exportar. Además se repasó el repositorio completo (secretos), los encabezados (CSP) y el ingreso de datos a la API.
**Método:** revisión del código de cada salida HTML y de cada entrada (formularios, archivo de iniciativas, «Completar con IA», respaldo, API), pruebas de contrato y seguridad HTTP, y una prueba de navegador nueva (`tests/e2e/xss1.js`) que carga textos con HTML en todos los campos nuevos y recorre 10 vistas, panel, formularios e importación con IA en ambas versiones.

## Hallazgos corregidos
| # | Severidad | Dónde | Hallazgo | Corrección |
| --- | --- | --- | --- | --- |
| 1 | Media | API (local y Azure Functions) | Sin límite de tamaño de la solicitud: un usuario con rol de edición podía enviar cuerpos muy grandes | Rechazo con 413 sobre 2 MB (`server.js`, `functions/api.js`) |
| 2 | Media | Core / API | Subfases sin forma estricta: campos extra, nombre no textual o sin largo máximo, id libre, sin tope de cantidad | `validarSubfases` (core C2.16): id `<iniciativa>-SF<n>`, nombre y responsable texto ≤ 120, solo campos permitidos, máximo 60 |
| 3 | Baja | Core / API | `hito.subfase` aceptaba cualquier texto | Debe tener el formato de id de subfase |
| 4 | Baja | Ambas apps | La preferencia «Tipo» guardada en el navegador no se validaba | Lista blanca (`prj`, `prop`, `all`) al leer y al cambiar |
| 5 | Baja | Ambas apps | Importar subfases (archivo e IA) aceptaba nombres no textuales o muy largos | Validación de texto ≤ 120 y máximo 60 por iniciativa; el formulario aplica los mismos largos |

## Verificado sin hallazgos
- **Inyección de HTML (XSS):** todas las salidas nuevas pasan por `esc()` o `selOpts()`; `xss1` no logra ejecutar código en ninguna vista de ninguna versión.
- **Autorización:** las subfases viajan dentro de la iniciativa (mismos permisos por rol; Lectura no escribe); la categoría y la subfase del hito pasan por `validarHito` y `validarHitoSubfase` en el servidor (422 con motivo).
- **Secretos:** ninguno en el repositorio (solo la clave pública *anon* del Prototipo, protegida por RLS, por diseño).
- **Encabezados:** CSP de la versión corporativa con `connect-src 'self'` y `frame-ancestors` limitado a Teams/Office.
- **Pruebas:** contrato (17 casos × 3 capas), seguridad HTTP (8), unitarias (19 de subfases y categorías) y 9 pruebas de navegador sobre la versión corporativa, en verde.

## Aceptado o pendiente (sin cambio en esta revisión)
- **CSP con `'unsafe-inline'`** en ambas versiones (aplicación de un solo archivo). Mitigado por el escape sistemático; quitarlo exige separar el JavaScript (posterior a producción).
- **Ventana de subfases al crear una iniciativa:** el servidor valida la forma, pero no la ventana, porque los hitos aún no existen; la valida el cliente y el servidor vuelve a validarla en la siguiente modificación de esa subfase.
- **Importador de iniciativas del Prototipo:** copia campos del archivo a la iniciativa (solo perfil Gasto). En la versión corporativa, el servidor valida cada registro.
- **Prototipo en Supabase (fuera de Aramark):** se retira el 03-12; migración limpia disponible.
- **Pendientes de producción ya informados a TI:** red privada, revisión o pentest de TI, rotación del secreto de Entra ID, política de retención.
