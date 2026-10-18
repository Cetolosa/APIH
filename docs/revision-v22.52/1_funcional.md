# Revisión QA funcional APIH V22.52 (revisor 1)

Método: copia demo en :8761, Playwright con datos sembrados (casos borde: sin fechas, fin<inicio, atrasado, Cierre, cancelado, completado, pausado) y lectura de código. Las 22 vistas se renderizan sin errores con datos normales; los fallos aparecen con datos mal formados, importadores y reglas de negocio. Líneas = /home/claude/apih/index.html. No se modificó ningún archivo del proyecto.

Resumen: Crítica 0 · Alta 6 · Media 11 · Baja 9 (+1 no reproducido).

---------------------------------------------------------------------
## ALTA
---------------------------------------------------------------------

### F-01 · Alta · Completar con IA (Chg.proyiaf, l.3870-3896): campos rechazados en la vista previa se aplican igual
Pasos: Subir JSON `{formato:'apih-proyecto-ia',proyecto_id:'PRJ-001',hitos:[{id:'HIT-002',resp:'Nuevo',fecha:'garbage',nombre:123,fase:'Inventada'}]}` y pulsar Aplicar.
Evidencia: la vista previa lista "1 cambio: resp" y "Se omiten 3: nombre inválido, fase inválida, fecha inválida". Tras Aplicar el hito queda `{"nombre":123,"fecha":"garbage","fase":"Inventada","resp":"Nuevo"}`. La closure de l.3882 asigna todo `h[k] !== undefined`, no solo lo validado. Consola: `TypeError ... reading 'toLowerCase'` en fmtD (l.859); las vistas Hitos (105/143 caracteres de salida) y Gantt quedan rotas, Calendario lanza `Invalid string length`/`getFullYear` de null.
Efecto: un JSON de IA mal formado deja datos corruptos y vistas inutilizables hasta editar el hito a mano.
Arreglo: en el bloque de hito existente, construir un objeto `ok={}` solo con las claves que pasan validación y aplicar `Object.assign(x, ok)`. Igual para `fechaReal` (l.3882 última rama).

### F-02 · Alta · Completar con IA (l.3887, 3893): un riesgo puede reasignarse a otra iniciativa
Pasos: JSON con `riesgos:[{desc:'nuevo r',cat:'Técnico',prob:2,imp:2,dueno:'x',mit:'m',ini:'PRJ-004'},{id:'RSK-001',ini:'PRJ-004',...}]` subido en PRJ-001.
Evidencia: `v = Object.assign({}, x||defaults, q)` conserva `q.ini`. Resultado: `RSK-004>PRJ-004`, `RSK-001>PRJ-004`. El control "no pertenece a este proyecto" solo mira `q.id`. Además, volver a subir el mismo archivo duplica los riesgos nuevos (probado: +2 riesgos; los hitos sí se deduplican).
Efecto: riesgos movidos a proyectos ajenos (incluso de otra área sin permiso) y duplicados.
Arreglo: `delete v.ini` junto con `delete v.id`; deduplicar riesgos nuevos por `_nrm(desc)` + `ini` como en hitos.

### F-03 · Alta · Importar respaldo (Chg.impfile, l.3789-3795): un respaldo sin listas deja la app muerta
Pasos: importar `{"v":3,"ini":[...]}` (sin hitos/riesgos/decisiones/comites/bitacora/usuarios).
Evidencia: `St` queda con claves `v,ini,cfg,ptpl,psnap,compromisos,cambios,notas,documentos`; las 22 vistas lanzan `Cannot read properties of undefined (reading 'find')`. La validación solo exige `ini` array y que las presentes sean arrays.
Efecto: respaldo parcial o de versión anterior bloquea la aplicación (en modo Supabase se sincroniza para todos).
Arreglo: tras `St = migrateV5(o)` completar `['hitos','riesgos','decisiones','comites','bitacora','usuarios','eventos','pres','iaLog'].forEach(k=>St[k]=St[k]||[])` y `St.cfgU=St.cfgU||{}`; o rechazar si faltan.

### F-04 · Alta · Importar iniciativas (Chg.impinifile, l.3814-3818): sin validación y falla a medias
Pasos: JSON con `{titulo:'Host1',fase:'Foo',estado:'Zzz',rag:'Morado',avance:'150',presupuesto:'abc',inicioPlan:'15/03/2026',finPlan:'2026-01-01',tipo:'proyecto'}`; otro con `hitos:[null,{...}]` y otro con `hitos:'abc'`.
Evidencia: se crea PRJ con fase 'Foo', estado 'Zzz', avance "150", presupuesto "abc", inicioPlan "15/03/2026", fin<inicio, tipo 'proyecto' (el spread de `x` pisa los defaults). Esa fase no está en ninguna columna del tablero (proyecto invisible aunque "N proyectos" lo cuenta) y `fmtD('15/03/2026')` lanza TypeError. `hitos:[null,...]` → `PE: Cannot read properties of null (reading 'fecha')` y `hitos:'abc'` → `(x.hitos||[]).forEach is not a function`: la iniciativa ya fue agregada (`St.ini.push`) pero sin hitos/riesgos, sin `refresh()` ni log (la callback del confirm está fuera del try). Riesgos importados con `id`/`ini` propios pisan los generados (`...r`, l.3818) → ids duplicados.
Efecto: datos inconsistentes, vistas con errores, importación parcial no atómica.
Arreglo: validar por fila antes de confirmar (fase ∈ fasesDe, estado ∈ estadosDe, rag/prioridad/moneda en catálogo, fechas ISO válidas y fin≥inicio, números finitos 0-100 / ≥0, `tipo` normalizado a 'Proyecto'|'Propuesta', hitos/riesgos arrays de objetos) y omitir/avisar; envolver el cuerpo de la callback en try/catch; whitelist de campos de riesgo (sin `id`/`ini`).

### F-05 · Alta · Compuertas de fase evitables: la ficha permite cambiar la fase y "Completado" no aplica compuertas de Cierre
Pasos: (a) Editar proyecto (iniForm l.2715 `{k:'fase',t:'select'}`), elegir Cierre, Guardar. (b) En Cierre, Acts.estado → Completado (l.2960-2976).
Evidencia: PRJ-001 (Ejecución, avance 45, 2 hitos abiertos, riesgo crítico abierto) pasa a fase 'Cierre' por la ficha sin evaluar `gates()`, sin entrada "Cambio de fase" en bitácora ni `inicioReal`/línea base. Luego "Completado" deja `[estado:Completado, avance:100 (forzado), finReal:hoy, hitos abiertos:2, riesgos abiertos:1]`. Acts.estado solo exige `i.fase==='Cierre'` y fuerza `avance=100` (l.2972).
Efecto: se vacía la regla "Completado solo en Cierre / con compuertas" y se falsea el avance; cualquier rol con permiso de edición del área puede evitar el bloqueo "solo Gasto fuerza" (no probado con rol Colaborador, sí con Gasto).
Arreglo: quitar `fase` (y `avance` si procede) del iniForm de edición o validarlo con `gates(i, o.fase)` en onSave (l.2724) exigiendo perfil Gasto + log; en Acts.estado ejecutar `gates(i,'Cierre')` como requisito de 'Completado' y no sobrescribir `avance`.

### F-06 · Alta · Compuerta "Cierre" imposible para plantillas con hitos en fase Cierre (l.1179, METODO_DEF l.960-964)
Pasos: crear proyecto con tipo "Datos y analítica (BI)" (T4; T2, T5, T6 tienen hitos en 'Cierre'), completar los hitos de Planificación/Ejecución/Transición, avance 100, Avanzar → Cierre.
Evidencia: `gates(i,'Cierre')` → `false: Todos los hitos completados` por el hito "Cierre y traspaso a soporte" (fase Cierre), que solo puede completarse estando en Cierre. Solo Gasto puede forzar (l.2800).
Efecto: bloqueo para Colaborador/Administrador en todo proyecto creado con esas plantillas; los demás lo fuerzan y queda "(forzado)".
Arreglo: en l.1179 excluir hitos de la propia fase destino: `hs.filter(h=>h.fase!==to).every(h=>h.completado)`.

---------------------------------------------------------------------
## MEDIA
---------------------------------------------------------------------

### F-07 · Media · Compuerta Cierre ignora riesgos críticos "En mitigación"/"Materializado" (l.1179)
`!riesgosDe(id).some(r => r.estado === 'Abierto' && expo(r) >= umbral)`, mientras `riesgoAbierto` (l.1140) es `estado !== 'Cerrado'`. Probado: PRJ-005 con riesgo 25 "En mitigación" → "Sin riesgos críticos abiertos: true". Arreglo: usar `riesgoAbierto(r)`.

### F-08 · Media · Alertas IA/campana obsoletas por caché incompleta (computeAlerts l.4869-4870)
La firma `sig` no incluye `mit`, `dueno`, `desc`, `titulo`, `lider`, `inicioPlan`, `presupuesto`, ni `resp`/`nombre` de hitos; `St.ver` es undefined en demo. Probado: riesgo crítico RSK-001 sin mitigación → alerta "Sin mitigación definida: R1"; se edita y guarda con "Plan X" (`mit` correcto en datos) y la alerta sigue idéntica. Renombrar una iniciativa deja el título viejo en las alertas. Efecto: contadores de la campana y panel IA incorrectos hasta cambiar otro dato. Arreglo: invalidar `_alertCache` en `save()` (usar `_ixGen` en la clave).

### F-09 · Media · NaN en ROI y puntaje de priorización (roi l.1135, priorScore l.3007)
`roi = ((i.beneficio - i.presupuesto)/i.presupuesto)*100` con `beneficio` undefined → NaN. Las iniciativas importadas no traen `beneficio` (defaults l.3814 no lo incluyen). Probado: propuesta importada con presupuesto 50 y score → `priorScore = NaN`; la vista Propuestas y el panel muestran "NaN" y "NaN%"; el export Excel escribe el texto "NaN". Arreglo: `roi`: `(+i.beneficio||0)`; agregar `beneficio:0` a los defaults del importador.

### F-10 · Media · Montos menores a 1 MM se muestran en 0 (fmtN l.868)
`fmtN = Math.round(n)`. Con unidad MM CLP, 0,4 → "0 MM CLP", 1,5 → "2 MM CLP", y los totales (sumM→fmtTot) pierden decimales. Probado con presupuesto 0.4: "0 MM CLP" en portfolio, panel y KPIs. Arreglo: formatear con hasta 1-2 decimales cuando |n|<10 (`maximumFractionDigits`).

### F-11 · Media · Se aceptan montos negativos (readForm l.2076, iniForm l.2715-2730)
`min:0` solo es atributo HTML; no hay validación en onSave. Probado: presupuesto -50 y consumido -5 guardados. Efecto: totales negativos y `r:7+Math.sqrt(presupuesto)*.45` → NaN en el radio de la matriz de Propuestas (l.3233). Arreglo: validar `>=0` en onSave de iniForm y de cambios (pNue).

### F-12 · Media · Eliminar iniciativa deja huérfanos y su ID se reutiliza con el historial ajeno (l.2735, nextId l.1001)
onDanger borra hitos y riesgos, pero no decisiones, compromisos, cambios ni notas. Probado: se elimina PRJ-007 (la de mayor número) con DEC y ACU asociados; `nextId` devuelve PRJ-007 al crear la siguiente y esta hereda 1 decisión y 1 compromiso ajenos. Arreglo: borrar/anular los registros por `ini` (o confirmar) y llevar un contador monotónico (`St.seq`).

### F-13 · Media · Compromisos: marcar cumplido ignora solo lectura/Invitado/área (Chg.acutoggle l.4137, checkbox l.4150)
No está en CHG_EDIT ni envuelta en `edit-only`. Probado con `St.cfg.readOnly=true`: `Chg.acutoggle` pasó el compromiso a "Cumplido" (mientras `hitotoggle` sí se bloqueó). Mismo caso `Chg.bitpres` (l.3606). Arreglo: añadir `'acutoggle','bitpres'` a CHG_EDIT y envolver el checkbox en `.edit-only`.

### F-14 · Media · Editar una decisión y cambiar el comité no actualiza el comité (decForm l.2839)
`Object.assign(d,o)` solo; el alta sí hace `c.decisiones.push`. Probado: DEC-001 de COM-001 a COM-002 → `d.comite='COM-002'`, pero `COM-001.decisiones=['DEC-001']` y `COM-002.decisiones=[]`; la vista Comité y el acta muestran la decisión en el comité equivocado. Eliminar un comité tampoco limpia `d.comite`. Arreglo: en edición, quitar el id de todos los comités y agregarlo al nuevo.

### F-15 · Media · Resolver decisión: efectos incoherentes (Acts.resolvedec l.2851-2860)
(a) "Diferida" suma 14 d a `limite` anterior: una decisión vencida hace 46 d queda en 2026-09-02 y sigue vencida (debería partir de hoy) y no respeta `decMaxDias`. (b) "Pausar"/"Cancelar" aplican sobre proyectos ya Completados: probado PRJ-005 Completado → "Pausado". (c) "Iniciar" fuerza `fase='Aprobación'` y aprueba sin `gatesAprobar` ni validar `estado` Vigente (aprueba propuestas Rechazadas/Retiradas/En espera): se creó PRJ con sponsor vacío y presupuesto 0. Arreglo: `addD(max(limite,hoy),14)`; ignorar efectos si `isDone(i)`; exigir `gatesAprobar` o dejar aviso/forzado solo-Gasto.

### F-16 · Media · Riesgos críticos de proyectos completados/cancelados cuentan en KPIs, insignia y chat (riesgosCriticos l.1139)
Sin filtro `isLive`. Probado: PRJ-001 Completado → `riesgosCriticos()` aún devuelve RSK-001 y RSK-002 (dashboard "Riesgos Críticos", insignia de menú, resumen ejecutivo). `findingsRiesgos` y `notifPara` sí filtran por vivas. Arreglo: añadir `isLive(byId(r.ini))`.

### F-17 · Media · Dashboard: ROI y consumo mezclan universos (kpis l.1156, dashboard l.3034)
`beneficio` suma solo `live` mientras `pres` suma todo salvo Cancelados (incluye Completados) → ROI "de proyectos" subestimado; `gas: sumM(L, gastado)` incluye Cancelados cuyo presupuesto se excluyó → % consumido inflado. Probado: pres 960, gas 410 (incluye 90 de un Cancelado), ben 1000 (excluye 600 del Completado). Arreglo: mismo conjunto en numerador y denominador (`L.filter(estado!=='Cancelado')`).

---------------------------------------------------------------------
## BAJA
---------------------------------------------------------------------

### F-18 · Baja · Búsquedas concatenan "undefined" (Portfolio l.3122; análogo en Decisiones l.3558 y Cambios l.4250)
`(i.titulo+i.id+i.lider+i.sponsor+i.proveedor+i.desc).toLowerCase().includes(q)`. Probado: buscar "defin" devuelve las 2 propuestas sin proveedor. Además une campos sin separador (falsos positivos entre fin de un campo e inicio del siguiente). Arreglo: `[..].map(x=>x||'').join(' ')`.

### F-19 · Baja · Insignia "Hitos" ≠ lista (navBadge l.2121 vs Views.hitos l.3380)
La insignia cuenta vencidos de Cancelados; la vista los excluye. Probado: insignia 3, chip "Vencidos" 2. Dashboard usa un tercer criterio (solo vivas). Unificar con un helper.

### F-20 · Baja · Gantt: "Solo pipeline" y rayado de propuestas nunca aplican (l.3296)
`rows` parte de `scope()` (solo proyectos) y filtra por `FASES_PIPE` (fases de propuesta) → siempre "Sin proyectos con fechas para mostrar" (probado). El subtítulo promete fechas tentativas de propuestas. Arreglo: usar `scopeAll()` o retirar la opción.

### F-21 · Baja · Comité: sugeridos usa campo inexistente (sugeridos l.3529)
`(i.fin && i.fin < hoy())`: `fin` no existe en el modelo; los proyectos atrasados nunca se sugieren, solo los Rojos. Arreglo: `atrasado(i)`.

### F-22 · Baja · Cargar Excel: tres imprecisiones (cxDate l.2578, parseo l.2604, cxapply l.2665)
(a) Fechas serial con hora: `Math.round(v)` suma un día (46300.75 → 2026-10-06 en vez de 05); usar `Math.floor`. (b) Montos en texto con punto decimal se leen como miles: "12.5" → 125, "1.5" → 15 (probado). (c) El avance cargado no se agrega a `hist` (sí lo hacen ficha, IA, Acts.estado), por lo que "Mi cocina"/tendencias no ven el avance.

### F-23 · Baja · Avisos de compromisos incompletos (notifPara l.3656 vs acuVencidos l.4114)
notifPara solo mira `St.compromisos`; las acciones/compromisos de comité no generan aviso aunque la insignia de Compromisos sí los cuenta (probado: insignia 2, avisos `comp_venc` 1). También `acuVencidos` compara `a.resp === me` sin normalizar (notifPara usa `_nrm`).

### F-24 · Baja · Historial/ficha: cambios silenciosos y ruido (audit l.1039-1066, iniForm l.2715)
Al guardar una iniciativa importada sin tocar nada más, el formulario escribe valores por defecto: probado "Categoría: — → Transformación Operacional | Moneda: — → CLP | Resp. negocio: — → — | Inicio plan: — → —". Es un cambio de dato no solicitado (la lista de categoría cae en la primera opción) y el diff trata `undefined`/`null` vs '' como cambio. Además cada edición de avance/presupuesto genera dos entradas (Edición + Actualización). Guardar sin cambios registra "Ficha actualizada" y refresca `actualizada` (limpia alertas "sin actualización"). Arreglo: normalizar `null/''/undefined` en `audit`, incluir la opción vacía en el select de categoría.

### F-25 · Baja · Capacidad: líderes sin normalizar (capData l.5065-5070)
Agrupa por `i.lider` literal: "Ana Pérez", "ana pérez" y "Ana Pérez - Beto" aparecen como tres personas con carga repartida (probado: Ana Pérez 5/3/3/2/2/1, ana pérez 1/1/1/1/0/0, "Ana Pérez - Beto" 1/1/1/1/0/0), mientras Personas divide por " - " y ",". Subestima la sobrecarga. Arreglo: reutilizar `split` + `_nrm` de personasData.

### F-26 · Baja · Exportes CSV sin neutralizar fórmulas (toCSV l.2107)
Título `=HYPERLINK("http://x","a")` sale tal cual en el CSV (se evalúa en Excel). El .xlsx nativo usa inlineStr y no es afectado. Arreglo: prefijar `'` si el valor empieza con `= + - @`.

---------------------------------------------------------------------
## No reproducido / dudoso
---------------------------------------------------------------------

### N-01 · Umbrales distintos según quién mira
`riesgosCriticos`, gates, avisos usan `cfgI(iniciativa)` (umbral del líder), pero las tarjetas "Críticos"/"Altos" de Riesgos y `nivelRiesgo` usan `cfgMi` (umbral del que mira) y los textos "Exposición 10–14" están fijos (l.3365, 3366). Con umbrales personales distintos las cifras de la vista y la insignia podrían diferir; no se probó con `cfgU` poblado.

---------------------------------------------------------------------
## Ejecutado sin hallazgos
Fechas: `addD/diffD/pD` seguros ante fin de mes, bisiestos y cambio de hora (usa 12:00). Calendario 6x7 y navegación de año correctos. Exportes JSON/Excel válidos. Sin errores de consola con datos válidos en las 22 vistas (los 404 de red son recursos estáticos ausentes en la copia /tmp). Presentaciones (19 diapositivas portafolio / 5 por proyecto) sin "undefined/NaN".
Falsos positivos ignorados según indicación: ROI NaN en demo (ver F-09 solo por la ruta de importación) y overlay de celebración.
