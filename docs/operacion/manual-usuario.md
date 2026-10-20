# APIH · Manual de usuario — C2.17

APIH es la plataforma de gestión del portafolio de Sistemas BISE. Reúne propuestas, proyectos, fases, hitos, riesgos, decisiones y comités en un solo lugar.

## 1. Acceso
- Entra a la dirección de APIH que informe Sistemas BISE e inicia sesión con tu **cuenta Aramark**. No hay contraseñas propias de APIH.
- Si ves «sin acceso», pide a Sistemas BISE que te agreguen al grupo de APIH que corresponda.
- Qué puedes hacer depende de dos cosas:
  - **Permiso**: Lectura, Editor o Administrador, según tu grupo de Entra ID.
  - **Rol en APIH**: Gasto, Administrador, Colaborador o Invitado. Define tus menús y qué áreas ves.

## 2. Navegación
| Menú | Para qué |
| --- | --- |
| Inicio → Dashboard / Mi cocina | Estado general del portafolio y tus iniciativas, pendientes y siguientes pasos |
| Iniciativas → Tabla / Tablero | Propuestas y proyectos juntos (filtro **Tipo**: Proyectos · Propuestas · Ambos). Tabla y tablero muestran lo mismo: fase con sus fechas, avance total y de la fase, hitos, desvío |
| Planificación → Gantt / Fases / Roadmap / Calendario / Hitos / Capacidad / Riesgos | Plan en el tiempo, fases y subfases, hitos por fase y categoría, carga de equipos y riesgos. Gantt, Fases, Roadmap, Hitos y Riesgos también usan el filtro **Tipo** |
| Gobierno → Pipeline de propuestas / Comité / Decisiones / Compromisos / Cambios | Evaluación y priorización de propuestas para el comité, actas, decisiones, acuerdos y solicitudes de cambio |
| Presentaciones | Presentaciones de proyectos y del portafolio |
| Administración | Parámetros, usuarios, bitácora, notificaciones (solo administradores) |

El buscador superior encuentra proyectos, propuestas, riesgos e hitos. El botón **Nuevo** crea propuestas, proyectos, hitos, riesgos y registros de gobierno.

## 3. Tareas frecuentes
- **Actualizar un proyecto:** abre la ficha, ajusta el avance, el RAG y el resumen, y guarda. APIH registra quién y cuándo.
- **Cambiar de fase:** usa el botón de fase de la ficha. Si falta algo (hitos, riesgos sin mitigar, campos obligatorios), APIH te lo indica.
- **Aprobar una propuesta:** en fase Aprobación, usa «Aprobar». Se crea el proyecto vinculado.
- **Hitos y riesgos:** créalos desde la ficha. Cada hito y riesgo tiene **categoría**; en la ficha y en las vistas Hitos y Riesgos puedes filtrar por ella. Los vencidos y los riesgos críticos se destacan en el Dashboard.
- **Descripciones:** fases, subfases e hitos pueden llevar una **descripción/instrucciones** (texto libre). La de la fase tiene una parte global (Administración → Metodología) y una **nota por proyecto** (ficha › Planificación → «+ Nota»). Se ven sobre todo en **Mi cocina**, junto a cada paso, y también en la ficha y en Fases.
- **Fases y subfases:** donde aparece la fase de una iniciativa se muestran su inicio y fin (desde el día siguiente al cierre de la fase anterior hasta su último hito). En la ficha › Planificación o en Planificación › Fases, «+ Subfase» divide una fase en etapas propias del proyecto: nacen con las fechas de la fase y **no pueden salir de ella**. Un hito puede asignarse a una subfase de su misma fase.
- **Propuestas:** su ficha tiene Planificación (fases con fechas, cronograma con hitos y riesgos, siguientes pasos), Hitos y Riesgos, igual que un proyecto. Sin fecha tentativa, sus fases parten en la fecha de creación.
- **Estados especiales:** «En espera», «Pausado», «Stand By», «Rechazada», «Retirada» y «Cancelado» piden un motivo. «En espera» y «Pausado» además piden una fecha de revisión. «Stand By» saca la iniciativa de todos los indicadores, avisos y de la presentación (solo se muestra su número en «Movimientos del ciclo»); en la Tabla de iniciativas sí aparece. Se reactiva volviendo a «En curso» (proyecto) o «Vigente» (propuesta).

## 4. Avisos
- La **campana** muestra avisos según tu relación con cada iniciativa (líder, sponsor, responsable): hitos y compromisos por vencer o vencidos, riesgos críticos, proyectos atrasados, cambios de fase, comentarios y asignaciones.
- En **Mi configuración → Notificaciones** eliges qué avisos recibes y por qué canal. Correo y Teams quedan disponibles cuando TI los habilite.

## 5. Completar con IA
En la ficha de un proyecto, **Completar con IA** exporta un archivo con las instrucciones necesarias. Úsalo con la IA corporativa y luego importa la respuesta. APIH muestra una vista previa y solo aplica lo que confirmes.

## 6. Importar y exportar
- **Administración → Importar iniciativas:** archivo JSON (descarga la plantilla para ver el formato). Acepta hitos con categoría, subfases y la subfase de cada hito por nombre. Lo que no cumple las reglas se omite con un aviso; el resto se importa.
- **Completar con IA** también lleva subfases y categorías, y muestra antes de aplicar qué entra y qué se omite.
- **Respaldo completo** (solo administradores) guarda y restaura todo.
- Excel, CSV y JSON de la Tabla son para consulta, no se reimportan.

## 7. Si algo no se guarda
- Si otra persona modificó lo mismo antes que tú, APIH te avisa y recarga los datos vigentes. Revisa y vuelve a aplicar tu cambio.
- Si el indicador de conexión de la barra superior muestra error, recarga la página. Si persiste, avisa a Sistemas BISE con una captura.

## 8. Ayuda
Menú **Ayuda → Para qué sirve**, o escribe a Sistemas BISE.

## Reporte de avance de la ficha
En la ficha de un proyecto, el botón **«Reporte 1 a 1»** (visible en la barra de la ficha, sin abrir «Más») arma la infografía de avance lista para copiar, descargar como HTML o guardar como **PNG** o **PDF** (botones «Guardar PNG» y «Guardar PDF» del modal; el PDF es de una página). Hay dos formas: **A** (una fase activa, con la línea de hitos) y **B** (múltiples hitos y fases paralelas, una caja por subfase activa). Se elige sola —B si la fase actual tiene 2 o más subfases activas— y se puede forzar. El reporte no se escribe a mano: toma el estado del RAG, el avance, los hitos (con su peso opcional), las subfases, los logros, los próximos pasos, el issue, y las decisiones pendientes y compromisos abiertos. Para que aparezca el «↑ desde» de cada fase, registra la actualización semanal. El reporte respeta la marca **«En presentación»**: los hitos y decisiones sin marcar no aparecen en la lista ni en los pendientes (el % de avance, «X de N hitos» y los contadores por subfase se calculan con todos los hitos). La casilla se ve y se cambia directamente en las listas (Tabla, Hitos, Riesgos, Decisiones y las pestañas Hitos, Riesgos y Actividad de la ficha).
