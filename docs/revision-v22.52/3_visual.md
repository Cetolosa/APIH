# APIH V22.52 · Revisión de diseño visual / UI (look & feel)

Método: Chromium headless (Playwright) sobre copia en `/tmp/rev3/demo/index.html`, datos sembrados (import `APIH_iniciativas_con_plan.json` + 7 iniciativas extremas: nombre de 160 caracteres, presupuesto 99.999.999 / 0, sin líder, cerrado/cancelado/pausado, propuestas; decisiones, compromisos, cambios, comité, evento). Capturas en `/tmp/rev3/shots/` (22 vistas × 1440 claro/oscuro, × 1024 y × 390 claro; paneles `i_pn_*`, popovers `i_pop_*`, formularios `i_f_*`, toasts `i_toasts_1440.png`, ficha `ficha_*`, estados vacíos `e_*.png`, menú contraído `m_rail_1440.png`, cajón móvil `m_drawer_390.png`). Contrastes: ratios WCAG calculados en el DOM (texto vs fondo efectivo compuesto) y con los tokens. Solo hallazgos reproducidos. Líneas = `index.html` (V22.52). No se modificó nada en `/home/claude/apih`.

## Resumen
30 hallazgos: 4 Altos, 17 Medios, 9 Bajos. Causa raíz común: el CSS se superpuso por capas (V4 → V6 → V22.27 → bloques inyectados desde JS en ~L9200) sin tokens estables, y la paleta de estado se calcula en JS con hex de la paleta antigua (Fluent) mientras el CSS ya migró a la marca (rojo #C8102E, verde #1E8A3E).

---
## Hallazgos

### V-01 · Alta · Filtros de Hitos, Riesgos, Gantt, Roadmap, Portfolio, Compromisos, Cambios, Bitácora, Personas, Calendario
- Evidencia: `hitos_1440_light.png`, `riesgos_1440_light.png` (5 selects), `compromisos_1440_light.png`. DOM: `select` dentro de `div.v22-row` (no `.toolbar`) → 0px radius, borde #767676, fondo #EFEFEF, 30/32px, 700 en "Por área/Sin agrupar". Los selects Área/Responsable (`label.flt select`) miden 28px, radius 4px, borde #BCBCBC. Hay 3 variantes de select en la misma barra.
- Causa: L65 y L517 estilan solo `.toolbar select`; el filtro V22 usa `.v22-row` (L9245) y no hereda.
- Arreglo: `.v22-row select{height:28px;border:1px solid var(--bd3);border-radius:var(--r);background:var(--card);color:var(--tx);padding:0 8px;font:600 13px var(--font)}` (y `[data-theme=dark]` ya hereda --card).

### V-02 · Alta · Paleta de estado hardcodeada en JS (ficha, Gantt, RAG, bitácora)
- Evidencia: `ficha_hist_1440_dark.png`. `RAG_C` (L911) = #107C10/#F2A100/#D13438; `hitoEstado()` (L1114-1119) devuelve `c:'#0D446A'` etc. usado como color de texto. Contrastes medidos: "En plazo" #0D446A sobre fondo oscuro = **1,51:1**; "Completado" #107C10 = 2,88; "Vencido" #D13438 = 3,13 (oscuro); "Vence en 5 d" #F2A100 sobre blanco = **2,13** (claro). Además es otra paleta que el CSS: rojo #D13438 (19 usos en JS) vs token `--red` #C8102E; verde #107C10 (19) vs `--green` #1E8A3E. Conviven dos rojos y dos verdes en la misma pantalla (punto RAG vs insignia de campana).
- Arreglo: que `RAG_C`/`hitoEstado`/`HS_TC` (L9546) devuelvan `var(--red)`, `var(--green)`, `var(--amber)`, `var(--pri)` y definir `--green-t/--amber-t/--red-t` (variantes de texto AA) por tema; `td` de estado con `color:var(--c)` + `font-weight:600`.

### V-03 · Alta · Popover «Columnas» (Portfolio)
- Evidencia: `i_pop_cols_1440.png`: el menú nace en x=224 y las casillas quedan recortadas por `#main{overflow:auto}`; solo se lee el texto de las columnas (no se ve a cuáles se marca). DOM confirma 19 `input[type=checkbox]` presentes.
- Causa: `class="pop cols" style="right:0"` (L3151) con el botón a 312 px del borde izquierdo y `.pop{min-width:210px}`.
- Arreglo: para este popover `left:0;right:auto` (o calcular volteo en `popToggle`: si `rect.left<0` → `left:0;right:auto`).

### V-04 · Alta · Capas z-index: el panel tapa popovers de la barra superior (≤980 px)
- Evidencia: a 390 px con panel abierto, `popToggle('pop-bell')` → `open=true` pero `elementFromPoint` en el popover devuelve `.pn-k` (panel). `#panel` z=35 (L219, fixed) > `.top` z=30 (L33) y el popover vive dentro de `.top`. Además el rect del popover sale en x=−16 (16 px fuera de pantalla). Escala usada: 1-7, 16, 20, 30, 35, 39, 40, 45, 50, 60, 90, 100, 200, 99998 sin tokens.
- Arreglo: `--z-top:60; --z-panel:35; --z-side:40; --z-pop:70; --z-modal:100; --z-toast:200` y `.top{z-index:var(--z-top)}`; en móvil `.pop{right:8px;left:auto;max-width:calc(100vw - 16px)}`.

### V-05 · Media · CSS inválido en L588 anula la regla `.pop-tabs`
- Evidencia: tras `.hs-more{…}` aparece `` `;document.head.appendChild(st); `` dentro del `<style>`. El parser lo agrega al selector siguiente y **descarta `.pop-tabs{display:flex;gap:4px;padding:6px 8px 4px;border-bottom:…}`** (L591). Computado en la campana: `display:block; padding:0; border-bottom:0`. Afecta Notificaciones (V22.44): las pestañas Avisos/Alertas IA pierden padding y separador (`i_pop_bell_1440.png`).
- Arreglo: borrar la línea 588.

### V-06 · Media · Tema oscuro: pares bajo AA
- Evidencia (ratio): pill por defecto `En curso/Vigente/Planificación` **3,22** (`.pill` color-mix 70% sobre blanco), `.pill.soft` "Abierto" 3,99, "Completado" 4,14; insignia de campana blanco/#F0646A **3,12** (11 px bold); iniciales en `.av` blanco sobre fondo de color 3,0 (9 px); `Profesional` activo del switch (#4F9BD0 sobre blanco) **3,03**; `.pv .dl.pos/.neg` (#0B6A0B/#B4262B, L563) sobre #1F252D **2,26/2,39**, sin override oscuro (`proyectos_1440_dark.png`, "+56" casi invisible); "Altos" KPI de riesgos con icono café sobre café.
- Arreglo: `[data-theme=dark] .pill{color:color-mix(in srgb,var(--c,var(--tx2)) 45%,#fff)}`; `--on-red:#1A0709` en dark para `.bell b`; `.pv .dl.pos{color:var(--green)}.neg{color:var(--red)}`; `.seg .on` oscuro con `color:#06182B` (ya existe L535 solo para `.seg .on`, falta el switch del encabezado).

### V-07 · Media · Logo «Be Well. Do Well.» ilegible en oscuro
- Evidencia: `crop_logo_dark.png` / `dashboard_1440_dark.png` (L2175 `img.side-logo`): azul-teal sobre #1F252D, sin variante.
- Arreglo: `[data-theme=dark] .side-logo{filter:brightness(0) invert(.92)}` o fondo claro `padding:6px;background:#fff;border-radius:4px`.

### V-08 · Media · Jerarquía tipográfica invertida
- Evidencia: `.ph h1` = 18 px/700 (L383; la base L42 dice 24 px), Mi cocina `h1.cs-h1` 21 px, el **título del panel `#panel .pn-h h3` = 19 px/700** (L607) es mayor que el título de la página, y `.card>header h2` = 13 px/600. Ver `i_pn_ini_1440.png` (título del panel de 5 líneas domina la pantalla).
- Arreglo: escala `--fs-h1:18px; --fs-h2:15px; --fs-h3:13px`; panel h3 → 16px/600 con `-webkit-line-clamp:3`; card h2 → 14px/600.

### V-09 · Media · Escala de radios: `--r` pasó a 4px pero quedan literales
- Evidencia: renderizado: 4px ×613, 8px ×381, 50% ×214, 9px ×27, 10px ×12 (`.cp-k .k`, `.cp-t` L640-641), 12px (`#panel .pn-sec` L610), 14px (`#main>.ph` L9238 y `.v22-row` L9240). `.ph` (14 px) y la tabla/tarjetas que siguen (4 px) se ven con esquinas distintas (`hitos_1440_light.png`). CSS: `border-radius:8px` ×78 vs `var(--r)` ×11.
- Arreglo: `--r-s:4px; --r-m:4px; --r-l:8px; --r-pill:999px`; reemplazar 8/9/10/12/14px por `var(--r-l)`/`var(--r-m)`; `.pill`, `.chip`, `em` de pestañas → `--r-pill`.

### V-10 · Media · 5 variantes de tarjeta KPI
- Evidencia (DOM): Dashboard `.kpi` pad 6/12/7, icono+etiqueta arriba (h=91); Hitos y Decisiones `.kpi.sm` borde superior 3px de color, pad 8/12, sin icono (h=93/89); Comité `.kpi.sm` centrado, 1px (h=59); Capacidad `.cp-k .k` radius 10px, pad 10/14 (h=71, L640); Riesgos/Propuestas con chip de icono `.k-ic` 24px radius 8px; IA `.agent` borde superior 4px (L180).
- Arreglo: un solo `.kpi` (pad 10/14, `border-top:3px solid var(--c,var(--bd))` opcional, `.k-ic` opcional, radio `--r-m`), y migrar `.cp-k .k` y `.kpi.sm`.

### V-11 · Media · Botones: halo del primario mal aplicado y 3 alturas
- Evidencia: `.btn.v22-main{box-shadow:0 0 0 3px color-mix(var(--pri) 22%)}` (L9216): 10 vistas lo tienen en el primario de la cabecera, pero Cielo, Bitácora (Publicar), IA y los `.btn.pri` de Decisiones/Cambios no; en Calendario lo reciben también **Hoy** y **Mes completo** (secundarios, `calendario_1440_light.png`), y parece foco permanente. Alturas: `.btn` 32, `.btn.sm` 28 (CSS dice 26, L44), `.seg button` 30, Presentaciones 30 (`.ph-act .btn{height:30px}` L428).
- Arreglo: quitar el halo (dejar solo `:focus-visible`), una sola altura `--h-ctl:32px` y `--h-ctl-sm:28px`.

### V-12 · Media · Cabecera de página `.ph`: acciones en otra fila y descripción cortada
- Evidencia: Dashboard/Riesgos/Decisiones/Comité/Compromisos tienen las acciones a la derecha del título; Hitos/Proyectos/Propuestas/Roadmap/Gantt las bajan a una segunda fila (`#main>.ph{flex-wrap:wrap!important}` L621 + `p{flex:1 1 60px}`). La descripción se corta con "…" sin tooltip (Proyectos: «Los proyectos nacen…») y a 1024 px queda cortada sin elipsis ("Ámbar = vence en", `hitos_1024_light.png`).
- Arreglo: `.ph-act{flex:none;margin-left:auto}` y `.ph p{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}` + `title`.

### V-13 · Media · Inputs nativos en Capacidad y Mi configuración
- Evidencia: `.cp-in` (3) y 6 `input` de `.mc-row`: 24,8px alto, radius 0, borde #767676 (`capacidad_1440_light.png`, `miconfig_1440_light.png`) frente a 32px/radius 4px en Administración → Parámetros (`admin_1440_light.png`).
- Arreglo: `.cp-in,.mc-row input{height:32px;border:1px solid var(--bd3);border-radius:var(--r);padding:0 8px;background:var(--card)}`.

### V-14 · Media · Iconos inexistentes (SVG vacío)
- Evidencia: `icon('download')` en L5092 (Capacidad) y L5113 (Personas) y `icon('info')` L3602/L3721 devuelven `<path d="">`: el botón «Exportar CSV» queda con hueco sin icono, a diferencia de Riesgos/Bitácora/Hitos/Roadmap (`ic:'down'`). Comprobado con `icon(name)` en 83 nombres.
- Arreglo: usar `'down'` o agregar `download`/`info` a `ICONS`; añadir `console.warn` en `icon()` para nombres no definidos.

### V-15 · Media · Dashboard con panel abierto (392 px) se comprime
- Evidencia: `i_pn_home_1440.png`: títulos de tarjeta en 2 líneas ("Estado del portfolio"), «Matriz →» y «Roadmap 2026 · Completo →» envueltos, tab «Mi trabajo» cortada ("Mi trabaj"), «Top riesgos» reducido a "Plan…", KPIs de 4 a 2 columnas con alturas desiguales.
- Arreglo: con panel abierto `#main .grid12 .c4{grid-column:span 6}` o `container-type:inline-size` y reglas `@container (max-width:900px)`; `.tabs button{white-space:nowrap}`.

### V-16 · Media · Tablero Kanban a ≤1100 px: solapes
- Evidencia: `proyectos_1024_light.png`: pill «En pausa» pisa «Ámbar»; contadores `2/2`, `5 ★1` y `3/4` se montan sobre el checkbox (`.kcol .icard .inc-mini{position:absolute;right:10px;bottom:7px}` L572-573 + pie con `padding-right:24px`); columna Cierre cortada.
- Arreglo: pie `flex-wrap:wrap` y checkbox como último ítem en flujo (no absolute); `.icard .rag{flex:none}` y `.k-h small` ocultar <1100.

### V-17 · Media · Bitácora a 390 px: compositor desborda
- Evidencia: `bitacora_390_light.png`: input de tema/texto comprimidos a ~16 px, «En presentación» cortado y botón «Publicar» en x=533 (> 390). `mainSW=533`.
- Arreglo: `.composer.big{flex-wrap:wrap}.composer.big input{flex:1 1 100%}` bajo 640 px.

### V-18 · Media · Estados vacíos inconsistentes
- Evidencia (`e_*.png`): ricos (icono + título + texto + CTA) en Hitos, Comité, Calendario, Mi cocina y «Top riesgos» del Dashboard; mínimos (icono + 1 línea, sin CTA) en Gantt, Decisiones, Compromisos, Cambios, Bitácora, Riesgos; **sin mensaje** (solo cabecera de tabla) en «Top proyectos críticos» del Dashboard y en Roadmap; solo texto en «Salud del portfolio»; Tablero con «Arrastra aquí» sin CTA.
- Arreglo: un componente `.empty` (icono 28px `--tx3`, título 14/600, texto 12 `--tx2`, CTA `.btn.pri.sm` opcional) y usarlo en todos los contenedores vacíos.

### V-19 · Media · «NaN%» en ROI
- Evidencia: `i_pn_ini_1440.png`, `m_panel_390.png`: panel de proyecto muestra «ROI NaN%» y propuesta «ROI estimado NaN%»; la misma iniciativa en la ficha muestra «ROI —» y `roi(i)` devuelve `null`; Propuestas KPI muestra «−100%».
- Arreglo: formato único `fmtRoi(v) = v==null||!isFinite(v) ? '—' : pct(v)` en panel, ficha y KPI.

### V-20 · Media · Tablas: métricas distintas y celdas multilínea sin padding vertical
- Evidencia: `th`: 11px/600 #4D4F4E (mini-tablas dashboard), 11,5px/700 #1A1A1A (tablas principales), 11,5px/600 #5F6160 (Capacidad), 12px/700 (Portfolio/Hitos/Riesgos); `td`: 12/13/11,5px y padding 6/6, 0/10, 6/14. `.tbl td` se redefine 3 veces (L110, L521, L653 → `padding:0 10px;height:40px`): en celdas de varias líneas (Riesgos «Descripción», Personas «Roles») el texto/los chips tocan los bordes de fila (`personas_1440_light.png`: chips en y=243 = borde superior de la fila).
- Arreglo: `.tbl td{padding:6px 10px;min-height:40px}` (no `padding:0`), `.tbl th{font:700 11.5px var(--font);color:var(--tx2);text-transform:none}` y reutilizar en `table.mini`, `.cp-t`, `.notif-t`.

### V-21 · Media · Contraste en claro
- Evidencia: Gantt etiqueta `12%` blanca sobre barra pálida **1,18** (la etiqueta cae sobre la parte pálida de la barra; `gantt_1440_light.png`); `.warnt` #B26A00 **4,24**; «+4 cupos» #1E8A3E 12,5px **4,41**; `i.ok` «✓ Al día» #2F7D32 **4,0** (Mi cocina); `small` blanco 85% sobre rojo (exposición 15) **3,95**; `.pv .dl` 10,5px.
- Arreglo: etiqueta del Gantt `color:var(--tx)` cuando el fondo es pálido; `--green-t:#17692F` (ya existe en `.prio.p-Baja`) y `--amber-t:#8A5A00` como colores de texto.

### V-22 · Baja · Tokens duplicados y capas contradictorias
- Evidencia: 3 bloques `:root` claros (L11, L282, L514/531) y 4 oscuros (L216, L296, L515, L532) que redefinen `--pri-d` (#0B5394 → #08304D), `--tx3` (#6B6967 → #7A7C7B → #5F6160), `--bg` (#F3F2F1 → #F4F4F4; oscuro #14181D → #121212), `--r` (8 → 4), `--navy` (#0B2A4A → #030303) y `--pri` oscuro (#4BA0F0 → #4F9BD0). Hex distintos: 159 en CSS + 218 en JS/HTML (340 únicos, 486 usos, 278 atributos `style=`). Casi duplicados: 8 rojos (#D13438, #C8102E, #B4262B, #B3261E, #A4262C, #C50F1F, #F0646A, #FC0119), 7 verdes, 8 ámbar/amarillos, 9 azules; sombra de hover aún usa el azul antiguo `rgba(15,108,189,.18)` (L86/6 usos).
- Arreglo: un único `:root` y `:root[data-theme=dark]` (ver propuesta) y lint de hex en CI (`grep -c "#[0-9A-Fa-f]\{6\}"`).

### V-23 · Baja · Escala tipográfica y tamaños mínimos
- Evidencia: 20 tamaños (7,5 · 8 · 9 · 10 · 10,5 · 11 · 11,5 · 12 · 12,5 · 13 · 14 · 15 · 16 · 17 · 18 · 19 · 20 · 21 · 22 · 24); el body computa 13px (la declaración L12 dice 14px). Texto <11px: etiquetas «Área/Responsable» 10px ×18 (`.flt small`), versión `.v22-ver` 10px ×20, iniciales `.av` 7,5–9px (L570 `font-size:7.5px!important`), deltas 10,5px. «Filtros» con `font-size:0` (L539) deja los selects sin etiqueta visible entre 700 y 1600 px.
- Arreglo: escala `11/12/13/15/18/24`; mínimo 11px; `.av{font-size:max(9px,.4em)}`.

### V-24 · Baja · Espaciado y sombras sin tokens
- Evidencia: `gap` usa 1,2,3,4,5,6,7,8,9,10,11,12,14,16,20px (+cqw); 25+ combinaciones de `padding`; alturas de control 20/22/24/26/28/30/32/34/36/38/40/44px; 20 sombras literales (anillos `0 0 0 2px #B3D3F2`, `0 0 0 2px #2F6AA3`, `0 18px 50px`, `0 8px 24px`, `6px 0 18px`…) con solo `--sh` y `--shl` definidos.
- Arreglo: `--sp-1..6: 4/8/12/16/24/32px`, `--h-ctl:32px;--h-ctl-sm:28px`, `--sh-pop`, `--sh-modal`, `--ring`.

### V-25 · Baja · `.card`: acento al pasar el mouse y paddings variables
- Evidencia: `.card{border-top:3px solid var(--bd2)}.card:hover{border-top-color:var(--pri)}` (L290) aplica a tarjetas estáticas (sugiere clic). Padding `.card` computado: 10/12, 14/16, 8/14, 10/10, 5/12 según vista; radio 4px vs `.pn-sec` 12px.
- Arreglo: limitar el hover a `.card[data-act]`; padding único `12px 14px`.

### V-26 · Baja · Móvil (≤640 px): orden y densidad
- Evidencia: `dashboard_390_light.png`, `hitos_390_light.png`: la tarjeta de filtros (≈200 px) va antes del título (en desktop el título va primero); las acciones de cabecera se apilan en 3 filas; tablas con scroll interno y `mainSW` 846-1354 px (Portfolio, Hitos, Riesgos, Gantt) – aceptable por `.tbl-w`, pero sin indicador de scroll.
- Arreglo: `order:-1` para `.ph` en móvil, filtros colapsados tras un botón «Filtros», sombra lateral en `.tbl-w`.

### V-27 · Baja · Administración: doble tira de pestañas
- Evidencia: `admin_1440_light.png`: tira superior (Parámetros · Bitácora · Mi configuración · IA) + tira interna (Parámetros · Catálogos …) con el mismo estilo y la etiqueta «Parámetros» dos veces; enlace «Cómo operar esta pantalla» sobre la cabecera (en el resto, el «?» está en la barra de filtros).
- Arreglo: nombrar la interna «Negocio» o convertirla en `.seg`; mover la ayuda al «?» estándar.

### V-28 · Baja · Calendario: lista «Eventos del mes» y chips
- Evidencia: `calendario_1440_light.png`: 12 de 13 eventos con título tachado (hitos completados) a 13px: legibilidad baja y el tachado domina; chips de día de 11px con color de fondo por tipo (verde pálido, rojo pálido) sin relación con las pills de estado; `+3 más` sin interacción visible.
- Arreglo: completados con `color:var(--tx3)` + icono ✓ en vez de `line-through`; chips con `--c` por tipo.

### V-29 · Baja · Contraste de bordes de controles
- Evidencia: `--bd3` #BCBCBC sobre blanco = 1,9:1 (claro) y #475260 sobre #1F252D = 1,94 (oscuro) → bajo 3:1 (WCAG 1.4.11) en inputs/selects/botones secundarios; borde de tarjeta `--bd` #DCDCDC sobre fondo #F4F4F4 = 1,25.
- Arreglo: `--bd3:#8F8F8F` (≥3:1) para controles; tarjetas pueden conservar `--bd`.

### V-30 · Baja · Barras de filtros: controles huérfanos en 2.ª fila
- Evidencia: Roadmap («Ocultar cerrados» + navegación de trimestre), Compromisos (select + segmento «Abiertos/Cerrados/Todos»), Cambios (segmento a la derecha solo), Bitácora (chips + select) y Riesgos (4 selects) envuelven a una segunda línea a 1440 px; el `.v22-row.one` fuerza `nowrap` solo en algunas vistas (L571).
- Arreglo: dividir en «fila de filtros» (izquierda) y «fila de vista/segmento» (derecha) con `justify-content:space-between` en todas las vistas.

---
## Coherencia vistas viejas vs. recientes (V22.43–V22.52)
- Historial (V22.43): `hs-tag` 10,5px/radius 10px y colores hex desde JS (`HS_TC` L9546, incluye #D13438); tamaños 12,5/11,5/10,5px fuera de escala (→ V-02, V-09, V-23).
- Notificaciones (V22.44): `.pop-tabs` sin estilos por el backtick (V-05); `.notif-t tr.grp td` usa `var(--bg2,#f3f4f6)` con fallback propio y `th` distinto (V-20).
- Calendario (V22.45-48): bien alineado con `--r`, pero con halo en secundarios (V-11) y chips fuera del sistema de pills (V-28).
- Capacidad (V22.49): radio 10px, KPI propio, input nativo, icono vacío (V-09, V-10, V-13, V-14); celdas de calor 34px con colores propios.
- Con IA (V22.50-52): `.agent` con borde 4px y botones `.btn.pri.sm` 28px (V-10, V-11).

## Tokens reales encontrados

| Propiedad | Valores usados (frecuencia en CSS) | Observación |
|---|---|---|
| font-size | 12px ×91, 11px ×85, 13px ×56, 15px ×16, 11,5px ×13, 24px ×9, 12,5px ×7, 18px ×5, 10,5px ×4, 14px ×3, 22px ×2, 7,5/10/19/20px ×1 (+ 16/17/21 en JS) | 20 tamaños; body real 13px; renderizado: 13px ×847, 11px ×503, 12px ×431 |
| font-weight | 600 ×70, 700 ×30, 500 ×5, 400 ×2, 800 ×1 | ok |
| font-family | `var(--font)` ×2, `var(--mono)` ×2, `Roboto,Inter,Arial` ×1 | 1 literal fuera de token |
| line-height | 1,5 ×7, 1,1 ×6, 1,15 ×6, 1 ×5, 1,35 ×5, 1,4 ×3, 1,25 ×3, 1,3 ×2 … | 11 valores |
| border-radius | 8px ×78, 4px ×37, 50% ×29, `var(--r)` ×11, 10px ×5, 3px ×4, 9px/6px/5px ×2, 12px, 14px, 999px, 1px | `--r`=4px (L282) pero 8px sigue dominando |
| box-shadow | `var(--sh)` ×14, `var(--shl)` ×8, 20 literales distintos | 2 tokens |
| gap | 10px ×47, 8px ×45, 6px ×37, 4px ×15, 12px ×15, 2px ×13, 14px ×11, 3px ×9, 5px ×8, 7px ×4 … | 15 valores |
| altura de control | 30px ×12, 26px ×11, 32px ×9, 28px ×5, 22px ×6, 20px ×5, 24px ×4, 40/34px ×3 … | botón 32 / sm 28 / seg 30 / select 28-32 |
| z-index | 1-7, 16, 20, 30 (.top), 35 (#panel, .p2-dr), 39, 40 (.side), 45 (rail), 50 (.gs-res), 60 (.pop), 90, 100 (modal), 200 (toasts), 99998 (.sky-pop) | sin escala |
| breakpoints | max 1280, 1100, 980, 900, 760, 700, 640, 520; min 700/900/981/1100 | 12 distintos |
| colores | 159 hex distintos en CSS, 218 en JS/HTML, 340 únicos; `#FFF` ×60, `#F5B82E` ×9, `#0D446A` ×8 | 278 `style=` inline |
| tokens de color claro (efectivos) | `--pri #0D446A`, `--pri-d #08304D`, `--pri-l #E6EEF4`, `--bg #F4F4F4`, `--bg2 #FAFAFA`, `--card #fff`, `--bd #DCDCDC`, `--bd2 #EBEBEB`, `--bd3 #BCBCBC`, `--tx #1A1A1A`, `--tx2 #4D4F4E`, `--tx3 #5F6160`, `--green #1E8A3E`, `--amber #E8A200`, `--red #C8102E`, `--redd #A4262C`, `--orange #CA5010` | ratios: tx/card 17,4; tx2 8,25; tx3 6,24; pri 10,23; green 4,41; amber 2,19 (solo fondo, no texto) |
| tokens oscuros | `--pri #4F9BD0`, `--bg #121212`, `--card #1F252D`, `--tx #E8EAED`, `--tx2 #A9B2BD`, `--tx3 #9AA5B1`, `--green #4CC24C`, `--red #F0646A` | tx 12,8; tx2 7,19; tx3 6,17; pri 5,09 |
| ratios de pills (claro) | 4,63 – 11,79 (mín. «en 5 d») | AA ok |
| ratios de pills (oscuro) | 3,22 (En curso, Vigente, Planificación) · 3,99 (soft/Abierto) · 4,14-4,98 resto | ver V-06 |

## Propuesta mínima de unificación (un único bloque de tokens)
```css
:root{
  /* color (marca) */
  --pri:#0D446A; --pri-d:#08304D; --pri-l:#E6EEF4; --navy:#0B2A4A; --brand-red:#FC0119;
  --bg:#F4F4F4; --bg2:#FAFAFA; --card:#fff; --bd:#DCDCDC; --bd2:#EBEBEB; --bd3:#8F8F8F;
  --tx:#1A1A1A; --tx2:#4D4F4E; --tx3:#5F6160;
  --green:#1E8A3E; --amber:#E8A200; --red:#C8102E; --orange:#CA5010;
  --green-t:#17692F; --amber-t:#8A5A00; --red-t:#A4262C;   /* texto AA */
  --font:'Segoe UI',system-ui,-apple-system,Arial,sans-serif; --mono:ui-monospace,'Cascadia Mono',Consolas,monospace;
  /* tipografía */
  --fs-xs:11px; --fs-s:12px; --fs-m:13px; --fs-l:15px; --fs-h2:18px; --fs-h1:24px;
  /* espaciado y tamaños */
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:24px;
  --h-ctl:32px; --h-ctl-sm:28px;
  /* forma */
  --r-s:4px; --r-m:4px; --r-l:8px; --r-pill:999px;
  --sh:0 1px 2px rgba(0,0,0,.08); --sh-pop:0 8px 24px rgba(0,0,0,.2); --ring:0 0 0 2px color-mix(in srgb,var(--pri) 35%,transparent);
  /* capas */
  --z-sticky:5; --z-side:40; --z-panel:35; --z-top:60; --z-pop:70; --z-modal:100; --z-toast:200;
}
:root[data-theme=dark]{
  --pri:#4F9BD0; --pri-d:#8CC1E6; --pri-l:#14293A; --bg:#121212; --bg2:#1B2027; --card:#1F252D;
  --bd:#3A4552; --bd2:#2A323C; --bd3:#6B7886; --tx:#E8EAED; --tx2:#A9B2BD; --tx3:#9AA5B1;
  --green:#4CC24C; --amber:#F5B83D; --red:#F0646A; --orange:#F08A4B;
  --green-t:#5FD07A; --amber-t:#F5B83D; --red-t:#FF8087;
}
```
Pasos (orden de menor riesgo): 1) borrar L588 y el icono `download`/`info`; 2) `.v22-row select` e inputs de Capacidad/Mi configuración (V-01, V-13); 3) `RAG_C`/`hitoEstado`/`HS_TC` a `var(--*)` (V-02); 4) un solo `:root` por tema y escala de z-index (V-04, V-22); 5) radios, KPI y botón único (V-09 a V-11); 6) `.empty` y `.tbl` únicos (V-18, V-20).
