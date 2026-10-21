# APIH — Documento de traspaso

> **Repositorio público (GitHub Pages).** Aquí no van correos personales, nombres de terceros ni el detalle de conversaciones con TI: eso vive solo en la copia privada del traspaso (proyecto de claude.ai). Este archivo se actualiza al cerrar cada versión para retomar desde cualquier cuenta. (18-10-2026 · Prototipo V22.62 · Corporativo C2.18)

Para retomar el trabajo en otra cuenta/sesión de Claude. Pega este archivo al inicio de la conversación y adjunta/clona el repo.

## 1. Quién y cómo trabajar
- **Dos cuentas de Claude:** el repositorio es la fuente común. Al cerrar cada versión Claude actualiza este archivo y deja copia de los documentos clave en `docs/`, para retomar desde cualquier cuenta con «lee docs/HANDOFF.md y sigue».
- **Christian Tolosa Delpino**, IT Business Partner BISE, Aramark Chile. Responder **en español**, conciso y técnico, ediciones quirúrgicas.
- Una acción del usuario a la vez. **Mockup antes de cambios grandes de layout.** Subir la etiqueta de versión (`VER` en index.html) en cada publicación.
- "Publica cada grupo apenas lo pruebes": rama por grupo → pruebas → merge a `main` → push. Terminar los mensajes de publicación con recordatorio **Ctrl+Shift+R**.
- **Nunca tocar secretos**: la clave `service_role` jamás en el repo; `apih-config.js` solo URL pública y anon key. No pedir ni guardar contraseñas.
- Commits terminan con las líneas de atribución de la sesión (Co-Authored-By / Claude-Session).
- No quiere reuniones con TI: todo **por correo, redactado con ayuda de Claude** (los envía desde su correo de Aramark).

## 2. Dos productos
| | APIH Prototipo | APIH Corporativo |
| --- | --- | --- |
| Estado | **Abierto** (V22.79). Congelar cuando el usuario lo pida | **C2.37** · usabilidad de pantallas (tabla con panel, títulos, distribución RAG, resumen en tarjetas) · escala tipográfica de 6 tamaños (11/12/13/15/18/24) · mejoras visuales (menú neutro, estados legibles, pie de tarjetas, franja cálida, tablas) · jerarquía visual y estilo (header claro, botones 12 px, alturas 28/32/40, un llamado a la acción por pantalla) · «Tus siguientes pasos» en grilla compacta (3/2/1 columnas), «Borrador del reporte semanal», «Qué cambió desde tu última visita», «Mi historial» y «Mi semana» en Mi cocina (historial de logros exportable; importancia + ajuste propio guardado, pendientes personales clasificados) + reporte de avance de la ficha (V22.66) + estado Stand By (V22.65) + paridad con el Prototipo + guía «Cómo operar» en todas las pantallas (V22.64) + verificación de despliegue (compuertas de Cierre, reabrir solo Admin, importación endurecida, ayuda «?» única, Administración con una barra) · `tests/e2e/correr-corporativo.sh` 16/16 · seguridad 25/25 (`defensas-api.js`) · producción objetivo **27-11-2026** |
| Versionado | V22.x (no sube más) | **C<n>.<m>** — ver `CHANGELOG.md` |
| Arquitectura | SPA de un archivo + Supabase (interino) en GitHub Pages | 3 capas exigidas por TI: SPA + Entra ID, backend/API, Azure SQL |
| Repo | `Cetolosa/APIH` (raíz: index.html, apih-config.js, supabase/) | mismo repo: `apps/corporativo`, `services/api`, `packages/core`, `db/`, `infra/`, `powerbi/`, `tests/`; luego repo de Aramark que indique TI |
| Salida | Se retira al entrar Corporativo (03-12) | Producción objetivo **27-11-2026** (plan acelerado C1.3) |

Estructura objetivo del monorepo: `packages/core` (reglas puras), `packages/ui`, `packages/data-supabase`, `packages/data-azure`, `apps/prototipo`, `apps/corporativo`, `services/api`, `db/`, `tests/`. **El prototipo sigue siendo `/index.html`** (no mover: rompe GitHub Pages). Funciones diferidas del prototipo, a construir una sola vez en Corporativo: Pronóstico financiero, Ruta crítica, Escenarios.

## 3. Lo decidido con TI (correo "Registro de aplicación interna APIH en Entra ID", 11–14 oct)
- El arquitecto de software de TI recomendó **3 capas**: SPA (Entra ID, publicable en Teams), Backend/API (seguridad, reglas, validaciones), **Azure SQL**. Vale aunque la solución sea temporal; sugirió el **mismo enfoque del Catálogo CMDB** (referencia existente).
- La Dirección de TI participa en el hilo. Christian respondió que **aplaza producción** hasta entender seguridad, capa de servicios y persistencia.
- Obsoleto: listas SharePoint + `Sites.Selected` (con Azure SQL, Graph se reduce a `User.Read`).
- Pendiente pedir a TI: hosting (Azure Static Web App), registro en Entra ID con asignación requerida, publicación en Teams, pipeline/ambientes, roles por grupos de Entra.
- **Reemplazado (16-10):** en vez de 6 preguntas, se envía la propuesta técnica construida (`docs/propuesta/`), con 15 puntos para revisar y tono colaborativo.

## 4. Documentos y datos creados
- Propuesta técnica para TI: **fuente vigente = Claude Docs** «APIH Corporativo · Propuesta técnica para revisión con TI» (https://claude.ai/code/artifact/ae0913ea-ba10-4bfd-a8b2-609b4d7e9754), **versión 2 (17-10)** con lo construido hasta C2.16, incluido el pentest interno (sección Seguridad); el PDF se descarga desde el doc. Enviada a TI: `docs/propuesta/APIH_Corporativo_Propuesta_TI_enviada_16-10-2026.pdf` (v1). `APIH_Corporativo_Propuesta_TI.pdf` es la v1 previa al envío.
- Documentos de operación (C2.15): `docs/operacion/` (guion UAT con casos V4, V5, F1–F3, I2; manual de usuario; runbook; clasificación de datos) y `docs/seguridad.md`.
- Plan vigente importable a APIH: `docs/APIH_Corporativo_plan_C2.22.json` (estado al 19-10; importarlo crea un proyecto nuevo, para el existente actualizar los campos a mano). Los de C2.15 y C1.3 quedan como histórico.
- Plan y brechas (Claude Docs, privado): https://claude.ai/artifact/2GquKhzaERtSspc3J9n8ay
- `docs/APIH_iniciativas_con_plan.json`: las 2 iniciativas con hitos y riesgos, listo para **Administración → Importar iniciativas** (el importador omite títulos que ya existen; si ya se cargó una versión previa, borrar y reimportar).
- Memoria del proyecto (claude.ai): `areas/apih.md`.
- **Registro de versiones:** `CHANGELOG.md` (raíz). **Decisiones:** `docs/decisiones/` (ADR-001…015).
- **Contrato de Iniciativa (para TI):** `packages/core/contracts/iniciativa.md` + `iniciativa.schema.json`.

## 5. Arquitectura del prototipo (para no redescubrirla)
- Un solo `index.html` (~1,4 MB, ~10.200 líneas), vistas con `Views.x`, acciones `Acts.x`, cambios `Chg.x`; render con `render()`; wrapper v22 post-render. Colecciones: ini, riesgos, hitos, decisiones, compromisos, cambios, notas, documentos, bitacora, comites. 22 vistas. CSP con `'unsafe-inline'`.
- Servicios: `AuthService` (provider msal|supabase), `DataService`, `SharePointService`, `SupabaseService extends SharePointService`. Config pública en `apih-config.js`; SQL en `supabase/apih_servidor.sql` (RLS, trigger de versión).
- `save()` → `audit()` (diff vs. baseline `audSnap`) → `DataService.commit()`. Historial por registro (`Edición` en bitácora), Notificaciones paramétricas (`NOTIF`, canales correo/Teams apagados), Calendario con modal de mes, panel contextual `pn-*`, menú lateral contraíble (`UI.rail`), Capacidad de equipos (`capData`), importadores (`impini`), **Completar con IA** por proyecto (`iapExport` / `Chg.proyiaf`, formato `apih-proyecto-ia`).
- Compuertas de fase: ver `gates()`. "Completado" solo en fase Cierre (`Acts.estado`). Roles: `rolActual()`, `puedeGobernar()`, `puedeEditarIni()`.
- Editar CSS: bloques de override antes de `/* ---------- V21: errores visuales ---------- */`; reglas posteriores necesitan prefijo `#main` o `!important`.

## 6. Pruebas
- Prototipo: `tests/e2e/` (Playwright sobre copia demo; ver su README). Regresión mínima: imp3, fin1, sf1, fz1, ps1, t13, t43, t44, cap2, r1, c4, imp1, imp2, ia1.
- Corporativo: `bash tests/e2e/correr-corporativo.sh` (corp1-3 + fin1/sf1/fz1/ps1/imp3 sobre la SPA corporativa, base nueva por prueba); `node tests/unit/*.js` (equivalencia 130.317 casos, subfases-categorías, notificaciones, Power BI, Teams, migración); `node tests/contract/run.js` y `http-seguridad.js`.
- **Flujo vigente (desde ADR-014):** Prototipo congelado; los cambios van directo a `apps/corporativo` → `correr-corporativo.sh`. (Mientras estuvo abierto: Prototipo primero → traspaso verificado línea a línea.)

## 6b. Estado del Corporativo
| Versión | Contenido |
| --- | --- |
| C1.0 | `packages/core/apih-core.js`: fechas y riesgo copiados de V22.52 |
| C1.1 | Contrato de Iniciativa (esquema, operaciones, reglas, errores), validador, pruebas de contrato, adaptador en memoria |
| C1.2 | CHANGELOG, ADR, este traspaso |
| C1.3 | Plan acelerado: `docs/APIH_Corporativo_plan_acelerado_C1.3.json` (21 hitos, 9 riesgos con fecha) |
| C1.4 | Core: compuertas, hitos, riesgos, ventanas de fase (equivalentes a V22.54) |
| C2.0 | API Node.js (`services/api`): reglas en servidor, auth Static Web Apps + Entra ID, roles, Azure Functions |
| C2.1 | Azure SQL (`db/azure-sql`), `store-mssql`, migración (`tools/migrar-desde-prototipo.js`) |
| C2.2 | SPA corporativa (`apps/corporativo`, copia de V22.54) conectada a la API |
| C2.3 | Infraestructura (`infra/`), pipeline, `docs/seguridad.md` |
| C2.4 | Propuesta para TI (Claude Docs, «Propuesta técnica para revisión con TI»): https://claude.ai/code/artifact/ae0913ea-ba10-4bfd-a8b2-609b4d7e9754 — página de resumen, 15 puntos para revisar (incl. notificaciones, suscripción Azure, directorio, IA, dirección web, soporte, clasificación de datos), anexo con los 21 hitos. PDF de 11 páginas. Tono 100 % colaborativo; no se habla de quién paga. |
| C2.5 | Traspaso en el repo como fuente común entre cuentas; PDF en `docs/propuesta/` |
| C2.6 | Migración limpia de toda la historia del Prototipo: «Importar respaldo» (Admin) en la SPA corporativa + modo migración en la API (conserva historial y fechas); e2e `corp2`. Propuesta actualizada: migración completa y «Completar con IA» (exportar con instrucciones → IA corporativa → importar) |
| C2.7 | Validación sin Azure: Bicep compila; paquete de Teams (`apps/teams`); login en Teams requiere ventana aparte (validar en dev). Funciones diferidas (Pronóstico, Ruta crítica, Escenarios): **el usuario aún no decide implementarlas** |
| C2.8 | Notificaciones en servidor: motor generado desde la SPA (`tools/generar-motor-notif.js`; regenerar si cambian reglas de avisos), envío por correo (Graph) o Teams (webhook) según defina TI, ADR-011. **Para la v2 de la propuesta:** punto 9 ya construido, TI solo elige canal y remitente |
| C2.9 | `docs/operacion/`: guion UAT, manual de usuario, runbook (punto 14), clasificación de datos (punto 15). Borradores para acordar con TI |
| C2.10 | Power BI: `003_reportes.sql` (esquema `rpt`), `powerbi/medidas.dax` y `powerbi/README.md`. Pendiente validar en dev |
| C2.11 | Versión final traspasada: subfases, propuestas como proyectos, Planificación con propuestas, categorías; core `HITO_CATS`, `validarSubfases`, `validarHitoSubfase`; API valida (422) |
| C2.12–C2.13 | Tabla y Tablero con ambos tipos (filtro Tipo), encabezado común de Iniciativas, «Pipeline de propuestas» en Gobierno |
| C2.14 | API valida solo subfases nuevas o modificadas; `correr-corporativo.sh` |
| C2.15 | Importar/exportar subfases y categorías (archivo de iniciativas, «Con IA»); la iniciativa con subfases se sincroniza antes que sus hitos |
| C2.16 | Revisión de seguridad: `docs/revision-seguridad-2026-10-17.md` (5 hallazgos corregidos, e2e `xss1`) |
| C2.17 | Descripción/instrucciones por objeto (V22.61, ADR-015): `faseDesc` global + `faseNota` por proyecto, `desc` en subfase e hito; se ven en Mi cocina, ficha y Fases; core valida ≤500 y escapa; e2e `corp3` verifica round-trip al servidor |
| C2.35 | Prototipo V22.77: mejoras visuales (ver CHANGELOG). |
| C2.36 | Prototipo V22.78: escala tipográfica de 6 tamaños (ver CHANGELOG). |
| C2.37 | Prototipo V22.79: usabilidad de pantallas (ver CHANGELOG). |
| C2.34 | Prototipo V22.76: jerarquía visual y estilo (ver CHANGELOG). Franja «Requiere tu atención hoy» en el Dashboard; botón «1 a 1» (antes «Reporte 1 a 1»); panel de 428 px. Pruebas `reporte1`, `ps1`, `grid1`, `standby1`. |
| C2.32 | Prototipo V22.74: «Tus siguientes pasos» en grilla compacta de 3/2/1 columnas; el puntaje es el control de importancia y «Ocultar hasta mañana» es icono. Prueba `grid1`. |
| C2.31 | Prototipo V22.73 + traspaso: «Borrador del reporte semanal» en Mi cocina (informes de estado de tus proyectos + hitos cumplidos en 7 días, para copiar). Prueba `rsem1`. |
| C2.30 | Prototipo V22.72 + traspaso: «Qué cambió desde tu última visita» al inicio de Mi cocina (vencidos, compromisos nuevos, cambios de otras personas); última visita en el perfil. Prueba `cam1`. |
| C2.29 | Prototipo V22.71 + traspaso: pestaña «Mi historial» en Mi cocina (proyectos liderados, hitos y compromisos cumplidos, desarrollo profesional; por período; copiar/descargar .md). Prueba `his1`. |
| C2.28 | Prototipo V22.70 + traspaso: «Tus siguientes pasos» por importancia 0–100 con ajuste propio persistente (perfil del usuario) y pendientes personales clasificados (Trabajo · Desarrollo profesional · Personal). Prueba `sem1`. |
| C2.27 | Traspaso de V22.69: 1 a 1 respeta la marca «En presentación»; casilla en pestañas de la ficha. |
| C2.26 | Traspaso de V22.68: «Reporte 1 a 1» exportable a PNG y PDF. |
| C2.25 | Traspaso de V22.67: botón «Reporte 1 a 1» visible en la ficha y el panel. |
| C2.24 | Traspaso de V22.66: botón «Reporte» en la ficha (infografías Forma A y B, automática o forzada); hito con peso opcional; `snapFase` por actualización. Prueba `reporte1`. |
| C2.23 | Traspaso de V22.65: estado **Stand By** (Propuestas y Proyectos) fuera de indicadores, avisos y presentación; la Tabla lo muestra; la presentación solo cuenta su número en «Movimientos del ciclo». Solo motivo; se reactiva a En curso/Vigente. Prueba `standby1`. |
| C2.22 | Paridad Prototipo ↔ Corporativo: misma regla de administrador (S-17) y prueba de paridad en el pipeline. **Regla: todo cambio del Prototipo se traspasa a Corporativo en la misma entrega; las SPA solo difieren en hosting y versión.** |
| C2.21 | Traspaso de V22.64: guía «Cómo operar esta pantalla» en todas las pantallas (solo desde «?»), «Reglas del juego» de Mi cocina en «?». |
| C2.20 | Verificación de despliegue: verificador de paquete y de ambiente, reintentos de conexión SQL, reemplazo de `<TENANT-ID>` en el pipeline, lista de comprobación por etapas (`docs/operacion/lista-despliegue.md`). |
| C2.19 | Traspaso de V22.63: núcleo (fechas con año 1900–2100, compuerta de Cierre exige avance 100 %, hitos completos y sin riesgos críticos abiertos), API (completar proyecto exige compuertas de Cierre; reabrir Completado/Cancelado solo Admin y limpia fecha de fin real), SPA (importación con lista blanca, ayuda «?» única, Administración con una barra, «Ver como»). `esAdminReal` tolerante se mantiene (S-17 solo Prototipo). |
| C2.18 | Encabezado compacto en 2 líneas (V22.62): el subtítulo se recorta con «…» y las acciones quedan en la línea del título (antes «Ver todo» caía a una línea propia con aire); solo CSS, sin cambio de lógica |
| Pentest | Pentest de caja gris de ambas versiones: `docs/pentest-2026-10-17.md` + `tests/seguridad/defensas-api.js` (25 ataques). Incorporado a la propuesta v2 y a la página de entregable a TI |
| Docs 17-10 | Propuesta v2 (Claude Docs), docs de operación, seguridad y plan C2.15 actualizados |
| Envío | 16-10-2026: propuesta enviada a TI (versión en `docs/propuesta/APIH_Corporativo_Propuesta_TI_enviada_16-10-2026.pdf`, sin la nota de login en Teams del punto 6). Cambios posteriores se acumulan para una v2 que se envía solo si TI la pide o al responder sus comentarios |

Reglas clave: **el Prototipo no se toca; lo que se necesite se copia y sigue con versión C** (ADR-002). Cada componente declara la última versión C en que cambió (ADR-005).

## 7. Pendientes
- **TI:** comentarios a la propuesta (esperados hacia el 21-10, sin presión); habilitar ambiente dev (04-11). La v2 de la propuesta se envía solo si TI la pide o al responder sus comentarios.
- **Al habilitar dev:** desplegar, validar en Azure (`tests/contract/run-azure-sql.js`), ejecutar el guion UAT.
- **Pendiente funcional (ideas aprobadas el 20-10):** historial (C2.29), «qué cambió» (C2.30) y borrador del reporte semanal (C2.31) ya hechos; bitácora automática ya existía; falta la comparación solo contra su propio historial (sin ranking). Editor de listas de categorías en Administración; selector Tipo en Calendario y Capacidad; funciones diferidas (Pronóstico, Ruta crítica, Escenarios): el usuario aún no decide; core: `pasosDe` y contratos propios de decisiones, compromisos, bitácora y comités (C1.5).
- **Prototipo:** abierto (V22.79). Congelar cuando el usuario lo pida.
- **Usuario:** que colegas creen contraseña individual y luego ejecutar SQL sección C (retirar la clave de equipo); (opcional) usuario «Bot IA» con rol Editor.
- **Limitaciones conocidas:** cfg/cfgU last-write-wins; "leído" de avisos solo por navegador; email/Teams requieren canal de TI; tags pueden no subir desde la nube (crear en GitHub Releases).
