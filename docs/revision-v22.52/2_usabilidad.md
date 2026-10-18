# APIH V22.52 — Revisión de usabilidad y coherencia de flujos

Método: copia en `/tmp/rev2/demo` (puerto 8762), Playwright, datos sembrados con `docs/APIH_iniciativas_con_plan.json` (2 proyectos, 22 hitos, 7 riesgos), roles simulados con «Ver como» (`FL.verComo`). Capturas en `/tmp/rev2/s/*.png`. Solo hallazgos verificados en ejecución o en código (se cita línea de `index.html`). No se modificó `/home/claude/apih`.

Conteo de clics medido (1440 px, modo Profesional):
| Tarea | Camino real | Clics |
|---|---|---|
| Crear proyecto | Iniciativas › Tablero › Nuevo proyecto › Título › Motivo › Crear | 2 clics + 2 campos obligatorios (quedas en la lista, sin abrir el proyecto) |
| Planificar hitos del proyecto nuevo | tarjeta › Ficha › Nuevo hito › (form) › Crear, por hito | 5 por hito (la pestaña Hitos del alta está bloqueada) |
| Registrar riesgo | Planificación › Riesgos › Nuevo riesgo › Proyecto › Descripción › Registrar | 4 + escritura |
| Actualizar semana | tarjeta › Actualizar › Guardar | 3 |
| Cambiar de fase | ficha › Avanzar a… › Aplicar (+ casilla «Forzar» si hay compuertas) | 2–3 |
| Cerrar proyecto (Completado) | ficha › Avanzar (hasta Cierre) › … › Estado › Completado › Aplicar | 6–8, sin acción «Cerrar proyecto» explícita |
| Preparar comité | Gobierno › Nuevo comité › (form) › Crear › Agregar tema ×N (texto libre) | 4 + N×3 |
| Completar con IA | ficha › … › Con IA › Descargar › (IA externa) › Subir respuesta › Aplicar | 5 |

---

## Hallazgos

### U-01 · Alta · Ficha › Editar › «Fase del workflow» salta las compuertas sin dejar rastro de «forzado»
- Qué ocurre: Editar proyecto (PRJ-002, fase Planificación, 2 compuertas incumplidas) › Fase del workflow = Cierre › Guardar → toast «Cambios guardados» y `fase` = Cierre. En bitácora solo queda «Actualizada: Fase: Planificación → Cierre». Por «Avanzar a Ejecución» la misma acción exige compuertas o la casilla «Forzar cambio pese a 2 compuerta(s) incumplida(s)».
- Por qué confunde: hay dos puertas con reglas distintas para el mismo cambio; las compuertas dejan de ser confiables y el comité no ve que fue forzado.
- Mejora: quitar `Fase del workflow` (y `Estado`) del formulario Editar o mostrarlo deshabilitado con el texto «Para cambiar la fase usa “Avanzar de fase” (aplica compuertas)». Alternativa: que `onSave` invoque la misma validación de `gates()`.

### U-02 · Alta · Estado › Cancelado: sin confirmación, irreversible y sin camino de vuelta; cerrar un proyecto no es una acción explícita
- Qué ocurre: …› Estado › Cancelado + motivo «x» › Aplicar → cambia al instante (sin `confirmBox`). Luego la ficha pierde Actualizar, Fase y Estado (el menú «…» solo deja «Con IA»; captura `m1_cancelado.png`) porque `isDone()` corta (`Acts.estado`, línea 2962). `Acts.reopen` existe solo para propuestas (línea 2977). «Completado» solo aparece en fase Cierre; el aviso está al pie del modal («Completado solo está disponible en la fase Cierre.»).
- Por qué confunde: una acción de un clic (pausa mal elegida → Cancelado) deja el proyecto en un callejón sin salida; para terminar un proyecto el usuario debe adivinar que hay que llegar a Cierre y luego abrir «…› Estado».
- Mejora: (a) `confirmBox('¿Cancelar el proyecto <b>X</b>? Quedará de solo lectura; podrás reabrirlo desde Estado.', …, 'Cancelar proyecto', true)`; (b) habilitar «Reabrir proyecto» (motivo obligatorio, como en propuestas); (c) en el encabezado de la ficha en fase Cierre mostrar el botón primario «Cerrar proyecto» que abra Estado ya en «Completado».

### U-03 · Alta · Eliminar: unas entidades piden confirmación y otras no; no existe «Deshacer»
- Verificado: eliminar riesgo (RSK-004) y comité (con su sesión) desde Editar › Eliminar → borrado inmediato, toasts «Riesgo eliminado» / «Comité eliminado». En código sin confirmación: hito (2812), riesgo (2824), decisión (2837), comité (2873), evento (3481), temas/acciones del comité `Acts.cdel` (3538), ítems de catálogo `catdel` (3783), hitos de metodología (3997). Con confirmación: proyecto/propuesta (2735), compromiso (4126), cambio (4218). No hay deshacer en toda la app (`grep deshacer` solo aparece en «no se puede deshacer»).
- Mejora: criterio único. Toda eliminación: `confirmBox(..., 'Eliminar', true)` con el nombre del registro y lo que arrastra («Se eliminan también 4 temas y 2 acuerdos»). Para eliminaciones menores, toast con acción: «Riesgo eliminado · Deshacer» (guardar el objeto 6 s).

### U-04 · Alta · Rol Invitado: todos los botones de edición se ven activos y fallan al hacer clic
- Qué ocurre: como Invitado, la ficha muestra Actualizar (botón primario), Editar, «Avanzar a Ejecución →», casillas «Incluir en presentación» y el menú Fase/Estado (`u_Ines_ficha.png`). Al pulsar: toast «Tu rol o el modo solo lectura no permiten editar» (Actualizar) o «Tu rol (Invitado) es de solo lectura: puedes ver y comentar, no editar» (Editar): dos textos distintos para lo mismo.
- Mejora: ocultar o deshabilitar (`disabled` + tooltip) las acciones de edición y mostrar una franja fija en la ficha: «Estás viendo como Invitado: solo lectura». Unificar el mensaje: «Tu rol (Invitado) es de solo lectura.»

### U-05 · Media · Dos buscadores con alcance distinto y mensajes distintos
- Verificado: la caja superior (placeholder «Buscar proyectos, propuestas, riesgos, hitos… ( / )») busca solo registros: «Supabase» → RSK-001; pero «riesgos», «Gantt» o «nuevo riesgo» → «Sin resultados». Ctrl+K (no anunciado en la barra) busca vistas y acciones («riesgo» → Riesgos, Nuevo riesgo) pero «Supabase» o «Plan agres» → «Sin coincidencias». Dos textos vacíos distintos («Sin resultados» / «Sin coincidencias»). «nuevo» no encuentra «Nueva propuesta» ni «Nueva decisión» (género).
- Mejora: un solo buscador: la caja superior abre la paleta (registros + vistas + acciones) agrupada («Registros», «Ir a», «Crear»). Texto vacío único: «Sin resultados para “xyz”. Prueba con otra palabra.» Mostrar el atajo «Ctrl+K» en el placeholder.

### U-06 · Media · Las acciones de flujo más importantes viven bajo un icono «···» sin etiqueta
- La ficha muestra 5 botones con texto (Actualizar, Informe, Editar, Gantt, Presentar) y un botón solo-icono «…» (title «Fase, estado y más») que esconde Con IA, Fase y Estado. «Avanzar a Ejecución →» está aparte, en la fila de fase. Resultado: «cambiar estado» y «Completar con IA» no se encuentran sin explorar.
- Mejora: reemplazar «…» por un botón con texto «Más acciones ▾» y ordenar: primario «Actualizar»; secundarios Editar / Informe; resto en el menú con «Cambiar estado…», «Cambiar fase…», «Completar con IA…». Gantt y Presentar pasan al menú.

### U-07 · Media · «Nuevo hito / Nuevo riesgo» desde listas preselecciona el primer proyecto; fases mezcladas; permiso se valida al final
- Verificado: desde Planificación › Riesgos (sin filtro) «Nuevo riesgo» abre con «PRJ-001 · APIH Prototipo» ya elegido (desde la ficha sí viene el proyecto correcto). En Nuevo hito, la lista «Fase» incluye Recepción, Evaluación, Caso de Negocio, Aprobación (fases de propuesta) junto a Planificación…Cierre, sin depender de la iniciativa. Con rol Colaborador (área MINERÍA) el selector ofrece proyectos BISE y el error aparece recién al guardar: «Sin permiso para guardar en el área BISE (tu rol edita solo MINERÍA)».
- Mejora: opción vacía «Elige un proyecto…» (obligatoria) o, si hay filtro de proyecto activo, usar ese; filtrar «Fase» según el tipo de la iniciativa; en Colaborador listar solo proyectos que puede editar.

### U-08 · Media · Alta de proyecto: formulario único de ~35 campos, pestañas bloqueadas y error poco localizable
- Verificado (`f1_nuevoproy.png`, `f2_save_vacio.png`): el modal tiene pestañas Finanzas/Riesgos/Hitos/Dependencias/Bitácora; Riesgos, Hitos y Bitácora muestran solo «Disponible después de crear el registro.». General contiene identificación, gobierno, fase/salud, fechas y seguimiento en un scroll largo. Al guardar vacío: toast «Completa: Título, Motivo de creación directa (sin propuesta previa)» y los campos se pintan de rojo, pero «Motivo» queda bajo el pliegue y el toast tapa los botones Cancelar/Crear. El texto de ayuda de «Tipo de iniciativa» manda a «Administración → Metodología», pantalla a la que un Colaborador no llega. «Beneficio real (acumulado)» y «Resultado alcanzado (obligatorio para la 3ª estrella…)» aparecen en el alta de un proyecto que aún no existe.
- Mejora: en el alta mostrar solo lo mínimo (Título, Tipo, Líder, Área, Fechas plan, Motivo) y un enlace «Completar más datos después»; ocultar las pestañas bloqueadas (o mostrarlas tras crear); al fallar, hacer `scrollIntoView` + foco al primer campo con error y mensaje bajo el campo («Obligatorio»).

### U-09 · Media · Tras crear, el usuario queda en la lista sin siguiente paso
- `Acts` crea el proyecto y muestra toast «Proyecto PRJ-003 creado»; no abre la ficha ni ofrece acción. Planificar hitos exige abrir ficha y repetir «Nuevo hito» (5 clics por hito).
- Mejora: toast con acción «Proyecto PRJ-003 creado · Abrir» y, en la ficha recién creada, un bloque «Siguiente paso: planifica hitos» (con «Cargar Excel» y «Precargar desde tipo»).

### U-10 · Media · Toasts: duración fija, se acumulan y sobreviven al modal que los originó
- `toast()` (línea 2027): 3,2 s para cualquier largo y sin acciones. Verificado: «Completa: Descripción del riesgo» sigue visible sobre el modal Nuevo hito abierto después (`o3_nuevohito.png`); tras importar iniciativas aparecen 3 toasts apilados («…importada(s)», «Insignia obtenida: Estrella Michelin», «Insignia obtenida: Meta del equipo») más un modal de celebración. Un toast de error largo desaparece antes de leerse.
- Mejora: errores de validación junto al campo (no toast); toasts de error con duración proporcional al texto (≥6 s) y botón cerrar; limpiar toasts al cerrar el modal; admitir `toast(msg, {accion:'Deshacer', fn})`.

### U-11 · Media · Importar/exportar: nombres, iconos y alcance incoherentes
- «Cargar Excel» (Proyectos, Hitos, Gantt) solo actualiza planificación e hitos de proyectos existentes (texto del modal, línea 2650: «no crea proyectos nuevos»); crear proyectos en lote solo es posible con «Importar iniciativas» (JSON), escondido en Administración › Datos y exportación y solo para Gasto. «Importar iniciativas» lleva icono de descarga (flecha abajo) y «Importar respaldo» icono de refrescar; el panel se llama «Exportación y respaldo» pero contiene importaciones. Portfolio › Más mezcla «Excel / JSON / CSV» sin verbo.
- Mejora: un solo punto «Importar / Exportar» con dos bloques («Importar» y «Exportar»), icono de subida para importar, y el modal de Excel con título «Actualizar planificación desde Excel». Verbos: Importar / Exportar / Descargar plantilla.

### U-12 · Media · Compuertas de fase: no accionables y mensaje ambiguo
- Verificado (`j2_avanzar.png`): lista con ✓/✗ («Presupuesto asignado», «Hitos de la fase Planificación completados (faltan 3)») pero las ✗ no enlazan a donde se corrige. «Aplicar cambio de fase» sin forzar → toast «Hay compuertas incumplidas. Márcalas como forzadas o completa los datos.» (líneas 2792/2953): no se entiende qué «marcar». Forzar no pide motivo ni confirmación. Título «Workflow de proyecto» es jerga.
- Mejora: cada ✗ con enlace («Asignar presupuesto» → Editar › Finanzas; «Ver 3 hitos pendientes» → sección Hitos); mensaje «Hay 2 compuertas sin cumplir. Marca “Forzar cambio” o completa los datos.»; al forzar, motivo obligatorio (queda en bitácora); título «Cambiar fase».

### U-13 · Media · «IA» nombra dos cosas distintas y la sección vive en Administración
- «Inteligencia del portafolio — Agentes IA simulados: reglas deterministas…» (reglas internas) comparte nombre con «Completar con IA» (IA externa por archivo), con «Alertas IA» de la campana y con «5 hallazgos de los agentes IA» en la franja del Dashboard. La pestaña IA está dentro de Administración (junto a Bitácora y Mi configuración) y es exclusiva del rol Gasto. Cada agente muestra «En espera» y botón «Ejecutar» aunque el texto dice que los hallazgos se actualizan solos.
- Mejora: renombrar los agentes a «Alertas automáticas» (o «Revisión del portafolio») y reservar «IA» para «Completar con IA»; quitar «En espera/Ejecutar» o explicar qué cambia al ejecutar.

### U-14 · Media · Completar con IA: instrucciones densas, vista previa con nombres técnicos
- Modal (`s1_conIA.png`): los 3 pasos van en un párrafo corrido, en registro «usted» («Descargue… Súbalo…»), footer vacío, y el menú «…» queda abierto detrás. «Pendientes hoy: 4.» no dice cuáles. La vista previa es buena (aplica solo tras «Aplicar», omite lo inválido) pero muestra claves internas y mensajes técnicos: «sponsor: — → Gerencia TI», «finPlan: 2026-12-22 → 2026-12-10», «Campo no editable por esta vía: foo», «prob e imp deben ser enteros 1-5»; título genérico «Confirmación».
- Mejora: pasos numerados como lista y botones junto a cada paso; listar los 4 pendientes; etiquetas legibles («Fin plan: 22 dic 26 → 10 dic 26»); errores en lenguaje de usuario («Riesgo nuevo: probabilidad e impacto deben ser de 1 a 5»); título «Revisar cambios de la IA»; cerrar popovers al abrir el modal.

### U-15 · Media · Arquitectura del menú: nombres de pestaña ≠ título de pantalla; agrupación poco intuitiva
- «Iniciativas» contiene Tabla (título de la pantalla: «Portfolio»), Tablero (título: «Proyectos») y Propuestas. «Planificación» agrupa Gantt, Roadmap, Calendario, Hitos, Capacidad y Riesgos: Riesgos no es planificación y Hitos/Riesgos son registros de cada proyecto. «Mis pendientes» (Colaborador) duplica Decisiones/Compromisos de Gobierno. El menú lateral solo marca el grupo; no hay migas (en la ficha el lateral queda en «Iniciativas»).
- Mejora: pestañas «Tabla de proyectos / Tablero» con títulos iguales; mover Riesgos y Hitos a «Seguimiento» (o «Iniciativas»); añadir migas «Iniciativas › Proyectos › APIH Corporativo».

### U-16 · Media · Administración: dos niveles de pestañas con «Parámetros» repetido; Mi configuración fuera del alcance de roles no admin
- Barra superior (Parámetros | Bitácora | Mi configuración | IA) y, debajo, otra barra (Parámetros | Catálogos | Metodología | Usuarios y roles | Notificaciones | Calidad de datos | Datos y exportación | SharePoint), más el enlace suelto «Cómo operar esta pantalla» sobre el encabezado (`v_pro_admin.png`). Un Colaborador no ve «Mi configuración» en el menú (solo se llega con Ctrl+K), aunque allí están sus avisos personales (Notificaciones).
- Mejora: separar «Mi configuración» (perfil y avisos, visible para todos, junto al avatar) de «Administración» (solo admin); en Administración un único nivel de pestañas; «Bitácora» y «IA» fuera de Administración.

### U-17 · Media · Ficha: página de ~3.000 px, panel lateral duplicado y tablero recortado
- La ficha tiene 9+ secciones apiladas (Resumen, Cifras, Salud, Logros, Hitos, Riesgos, Compromisos, Decisiones, Control de cambios, Historial, IA, Documentación) con «Más (9) ▾»; el panel lateral repite Resumen/Hitos/Riesgos/Actividad/IA y sus propios botones (Actualizar, Ficha, Herramientas). Al abrir el panel sobre el Tablero a 1440 px las columnas se recortan (`g1_click_card.png`: «Cierre» cortada). «Doble clic = ficha completa» solo se explica en el popover de ayuda; en Tablero la ayuda dice «Clic en una fila» aunque son tarjetas.
- Mejora: ficha con pestañas reales (Resumen · Plan (hitos+riesgos) · Gobierno (decisiones, compromisos, cambios) · Historial); un solo patrón de apertura (clic en tarjeta = panel con botón «Abrir ficha» visible, ya existe; quitar «doble clic» de la ayuda).

### U-18 · Media · Estados vacíos inconsistentes y CTA duplicados
- Decisiones: «No hay decisiones con estos filtros» aparece con los filtros por defecto (Pendiente) y sin explicación ni acción; Cambios: «No hay solicitudes de cambio en esta vista». Comité y secciones de la ficha sí explican y ofrecen botón, pero duplican la acción del encabezado con verbos distintos: Nuevo comité / Crear comité; Nuevo compromiso / Crear compromiso; Nueva decisión / Registrar decisión; Nueva solicitud / Solicitar cambio.
- Mejora: plantilla única «Aún no hay X. [para qué sirve]. [Botón]» y, si hay filtros: «Ningún resultado con estos filtros · Quitar filtros». Mantener un solo botón visible (si hay empty state, ocultar el del encabezado o dejar el mismo verbo).

### U-19 · Media · Preparar comité: agenda vacía y manual
- Verificado: Nuevo comité (Nombre + Fecha) crea una sesión con 0 temas; «Agregar tema» abre un formulario de texto libre + un único proyecto opcional. No hay «Cargar agenda sugerida» (propuestas en Aprobación, proyectos en Rojo/Ámbar, decisiones pendientes, hitos vencidos) aunque el sistema ya calcula todo eso. Conceptos solapados: KPI «Acciones/compromisos abiertos» y secciones separadas «Acciones» y «Compromisos».
- Mejora: botón «Armar agenda desde el portafolio» (marca casillas y crea los temas) y unificar «Acciones» y «Compromisos» como «Compromisos».

### U-20 · Media · Dashboard: «Atrasados 0» contradice «1 hito vencido»
- `v_simple_dashboard.png`: KPI «Atrasados 0 · Sin desviaciones relevantes» junto a la franja «1 hito(s) vencido(s)» y el panel «1 hitos vencidos sin completar». «Atrasados» mide proyectos por fecha plan, no por hitos; el usuario lo lee como atrasos en general. «Presupuesto Total 0 MM» con presupuesto vacío se muestra como cifra real y no como «Sin dato» (como sí hace Beneficio).
- Mejora: renombrar el KPI «Proyectos atrasados (fecha plan)» y añadir «· 1 hito vencido»; mostrar «Sin dato» donde no hay presupuesto.

### U-21 · Media · Modo Simple/Profesional se reinicia cada sesión y duplica controles
- `modoUI` parte siempre en Simple (línea 4704/9885); el toast dice «Interfaz Profesional (vale para esta sesión)». El conmutador está en la barra y de nuevo en «···» (Interfaz); el selector global «Área» de «···» duplica el filtro «Área» de cada vista. En Simple el botón «Ver todo» (texto plano) revela filtros/columnas ocultas y su etiqueta no dice qué revela.
- Mejora: recordar el modo por usuario (el comentario de código ya lo prevé: «St.cfgU[usuario].ui»); renombrar «Ver todo» → «Mostrar filtros y columnas»; eliminar el duplicado de «···».

### U-22 · Media · Rol «Gasto» sin explicación; «rol» y «perfil» se mezclan
- Mensajes: «La gestión de comités es del rol Gasto o Administrador», «La sección IA es exclusiva del rol Gasto», «Solo el perfil Gasto puede importar iniciativas», «Perfil Gasto: tus cambios valen para todo el portafolio» (9 «perfil Gasto» y 3 «rol Gasto» en el código). Para un PMO «Gasto» no comunica «administrador del portafolio»; además existe el rol «Administrador» con menos permisos.
- Mejora: nombre de rol que describa la función (p. ej. «PMO») o glosario en Administración › Usuarios y roles, y una palabra única («rol») en todos los mensajes.

### U-23 · Baja · Registro «tú» vs «usted»
- «tú»: «Completa:», «Indica el motivo», «Sal de “Ver como”», «Tu rol…». «usted»: «Descargue la plantilla… complétela… súbala… verá una vista previa… usted puede editar» (Cargar Excel, línea 2650), «Descargue el archivo… Súbalo» (Completar con IA), «use “Aprobar y crear proyecto”» (línea 2967), «Exporte un respaldo antes de cerrar o conecte SharePoint» (Administración).
- Mejora: unificar en «tú» (como el resto de la app).

### U-24 · Baja · Errores de redacción visibles
- Verificado: «Propuesta PROP-001 creadoa» (línea 2745: `' creado' + (PR ? 'a' : '')` → «creada»); bitácora «Proyecto importada: APIH Corporativo» (línea 3818: `T + ' importada'`); Dashboard «1 alertas críticas», «1 hitos vencidos sin completar»; «Sólo lo mío» (tilde) vs «Solo» en mensajes.
- Mejora: concordancia («Propuesta creada», «Proyecto importado», «1 alerta crítica», «1 hito vencido»).

### U-25 · Baja · Cuatro lugares de ayuda
- Icono «?» de la barra (ayuda de la pantalla, con «Ver recorrido»), enlace «Cómo operar esta pantalla», «?» al final de cada barra de filtros, y «Ayuda › Para qué sirve» en el menú.
- Mejora: un solo «Ayuda» con contenido contextual + enlace a «Para qué sirve».

### U-26 · Baja · «Mi cocina»: metáfora sin glosario y celebraciones que interrumpen
- Tenedores, Pinche, Cocinero, Salón de chefs, estrellas Michelin, «Ronda de actualización» se usan sin definición en la pantalla (solo en la pestaña «Cómo funciona»). Aparece como segunda pestaña de Inicio. La insignia «¡Estrella Michelin!» abre un modal central sobre la pantalla de trabajo (visible en `v_simple_proyectos.png`).
- Mejora: subtítulo con una frase («1 tenedor = 1 cosa al día en tu proyecto: hitos, riesgos, avance…») y celebración como toast no bloqueante.

### U-27 · Media · Responsive 1024 px: scroll horizontal de la página y tarjetas solapadas
- Medido: `document.scrollWidth` = 1184 > 1024 en todas las vistas. En Proyectos › Tablero la columna «Cierre» queda cortada (`r1024_proyectos.png`); en las tarjetas el checkbox de «Incluir en presentación» se superpone con el contador de hitos («🍴 4/4 ☑ ★1», también visible a 1440 con el panel abierto).
- Mejora: evitar `min-width` fijo del layout (el origen son los 160 px de desborde); columnas del tablero con scroll propio visible o apiladas; separar el checkbox de la fila de métricas.

### U-28 · Media · Responsive 390 px: acciones clave cortadas y filtros que ocupan la pantalla
- Ficha: la fila Actualizar / Informe / Editar / Gantt se corta (Presentar y «…» quedan fuera) y «Avanzar a Ejecución →» se recorta a «A» (`r390_ficha.png`). Cada vista abre con el bloque «Filtros» (Área, Responsable, Sólo lo mío) de ~150 px antes del contenido (`r390_dashboard.png`, `r390_riesgos.png`); en Riesgos las pestañas se cortan sin pista de scroll («Gantt Roadmap Calendario Hitos Ca…»). El conmutador Simple/Profesional deja de verse. El modal de Actualización semanal sí funciona bien en móvil.
- Mejora: botones de la ficha en un menú «Acciones» en móvil con «Actualizar» fijo; filtros plegados por defecto («Filtros (2)»); pestañas con degradado/flecha de scroll.

### U-29 · Baja · Presentaciones: acción principal escondida y portada ilegible
- «Presentar», «PowerPoint», «PDF», «HTML» y «Guardar en historial» están dentro de «Más». La portada del deck del portafolio muestra el kicker «PORTAFOLIO INICIATIVAS TI» en azul oscuro sobre fondo negro (casi invisible, `v_pro_presentaciones.png`).
- Mejora: «Presentar» como botón primario y «Exportar ▾» (PowerPoint/PDF/HTML); corregir el color del kicker en el tema oscuro.

### U-30 · Baja · Microtextos y abreviaturas
- Columna «En pres.» (Portfolio, Riesgos, Hitos) = «Incluir en presentación»; casilla sin texto en cada tarjeta del tablero; «Fin plan / Fin estimado / Fin proyectado / Fecha objetivo» para fechas similares; «0 MM CLP» como si fuera dato; el cuadro «Línea base: sin congelar [Congelar]» no explica qué ocurre; «Clasificación» muestra «·» cuando está vacío (`g2_ficha.png`); Actualización semanal: el valor del slider «5» queda parcialmente tapado y los enlaces «usar» no dicen qué usan.
- Mejora: «Incluir en presentación» como cabecera con tooltip, «En deck» como mínimo; «usar» → «Usar 8 % (según hitos)»; «—» en vacíos; tooltip en Congelar («Guarda las fechas y el presupuesto actuales como referencia para medir desviaciones»).

---

## Quick wins (bajo esfuerzo, alto impacto)
1. Corregir «creadoa» → «creada» y «Proyecto importada» → «importado» (líneas 2745, 3818) + plurales del Dashboard (U-24).
2. `confirmBox` en eliminar riesgo, hito, decisión, comité, evento y temas de comité (U-03).
3. `confirmBox` al cancelar un proyecto/propuesta y habilitar «Reabrir» para proyectos (U-02).
4. Quitar `Fase del workflow` del formulario Editar o deshabilitarlo con texto «Usa “Avanzar de fase”» (U-01).
5. Ocultar/deshabilitar botones de edición para Invitado y añadir la franja «Solo lectura» (U-04).
6. Mensaje de compuertas: «Hay N compuertas sin cumplir. Marca “Forzar cambio” o completa los datos.» + enlaces en cada ✗ (U-12).
7. Selector «Proyecto/Iniciativa» de Nuevo hito/riesgo con opción vacía obligatoria (U-07).
8. Un único texto vacío de búsqueda y mostrar «Ctrl+K» en el placeholder de la barra (U-05).
9. Duración del toast según el largo (≥6 s en errores), vaciar toasts al cerrar el modal y hacer `scrollIntoView` al primer campo inválido (U-08, U-10).
10. Recordar Simple/Profesional por usuario (U-21) y renombrar «Ver todo» → «Mostrar filtros y columnas».

## Inconsistencias de lenguaje
| Término A | Término B (y C) | Dónde |
|---|---|---|
| Portfolio | Portafolio | Título de la tabla («Portfolio») y botón «Portfolio →» vs «Portafolio TI Operaciones», «Estado del portafolio», `NAV_GRP` «Portafolio» |
| Iniciativa | Proyecto / Propuesta / Registro | Menú «Iniciativas», selector «Iniciativa *» en Nuevo hito, «Proyecto / iniciativa *» en Nuevo riesgo, «Proyecto» en columnas |
| Tabla | Portfolio | Pestaña «Tabla» y título de la pantalla «Portfolio» |
| Tablero | Proyectos | Pestaña «Tablero» y título «Proyectos» |
| Salud (RAG) | RAG / Semáforo | Formulario, columna «RAG», «Semáforo de propuestas», «Semaforización automática» (Hitos) |
| Fin plan | Fin estimado / Fin proyectado / Fecha objetivo (de término) | Formularios, ficha y propuestas |
| Responsable | Líder / Líder / Responsable / Dueño / Resp. negocio | Columna «Responsable», campo «Líder / Responsable», riesgo «Dueño», ficha «Resp. negocio» |
| Compromisos | Acciones / Acuerdos | Comité: KPI «Acciones/compromisos abiertos», secciones «Acciones» y «Compromisos», texto «acuerdos de cada sesión» |
| Control de cambios (pantalla) | Cambios (pestaña) / Solicitud de cambio / Solicitar cambio / Nueva solicitud | Menú Gobierno, ficha y botones |
| Nuevo X | Crear X / Registrar X / Agregar X / Solicitar X | Comité: «Nuevo comité» y «Crear comité»; decisión: «Nueva decisión» y «Registrar decisión»; hito/compromiso/tema: «Agregar» |
| Cargar Excel | Importar (iniciativas/respaldo) / Subir respuesta | Proyectos/Hitos/Gantt vs Administración vs Completar con IA |
| Alta directa | Nuevo proyecto | Menú «Nuevo» («Nuevo proyecto (alta directa)») y Proyectos › Más («Alta directa») |
| Sin resultados | Sin coincidencias | Buscador superior vs Ctrl+K |
| Rol | Perfil | «rol Gasto» vs «perfil Gasto» |
| Agentes IA (reglas) | IA (Completar con IA) / Alertas IA | Administración › IA, ficha › Con IA, campana |
| Presentación (deck) | En pres. / Incluir en presentación | Sección «Presentaciones» vs casillas y columnas |
| Sólo lo mío | Solo… | Filtro vs mensajes («Solo el perfil Gasto…») |
| Tú (Completa, Indica) | Usted (Descargue, Suba, use) | Formularios vs Excel/IA/Admin |
