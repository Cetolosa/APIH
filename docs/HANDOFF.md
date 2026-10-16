# APIH — Documento de traspaso

> **Repositorio público (GitHub Pages).** Aquí no van correos personales, nombres de terceros ni el detalle de conversaciones con TI: eso vive solo en la copia privada del traspaso (proyecto de claude.ai). Este archivo se actualiza al cerrar cada versión para retomar desde cualquier cuenta. (15-10-2026 · Prototipo V22.54 · Corporativo C2.10)

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
| Estado | **Congelado** (V22.52) con excepciones **V22.53** (vista Fases, ADR-006) y **V22.54** (Planificación en ficha + Siguientes pasos, ADR-007); **congelado nuevamente en V22.54** | En construcción, **C1.3** · producción objetivo **27-11-2026** (plan acelerado) |
| Versionado | V22.x (no sube más) | **C<n>.<m>** — ver `CHANGELOG.md` |
| Arquitectura | SPA de un archivo + Supabase (interino) en GitHub Pages | 3 capas exigidas por TI: SPA + Entra ID, backend/API, Azure SQL |
| Repo | `Cetolosa/APIH` (raíz: index.html, apih-config.js, supabase/) | mismo repo, monorepo (carpetas vacías aún), luego repo de Aramark que indique TI |
| Salida | Se retira al entrar Corporativo | Producción objetivo **22-12-2026** (agresivo) |

Estructura objetivo del monorepo: `packages/core` (reglas puras), `packages/ui`, `packages/data-supabase`, `packages/data-azure`, `apps/prototipo`, `apps/corporativo`, `services/api`, `db/`, `tests/`. **El prototipo sigue siendo `/index.html`** (no mover: rompe GitHub Pages). Funciones diferidas del prototipo, a construir una sola vez en Corporativo: Pronóstico financiero, Ruta crítica, Escenarios.

## 3. Lo decidido con TI (correo "Registro de aplicación interna APIH en Entra ID", 11–14 oct)
- El arquitecto de software de TI recomendó **3 capas**: SPA (Entra ID, publicable en Teams), Backend/API (seguridad, reglas, validaciones), **Azure SQL**. Vale aunque la solución sea temporal; sugirió el **mismo enfoque del Catálogo CMDB** (referencia existente).
- La Dirección de TI participa en el hilo. Christian respondió que **aplaza producción** hasta entender seguridad, capa de servicios y persistencia.
- Obsoleto: listas SharePoint + `Sites.Selected` (con Azure SQL, Graph se reduce a `User.Read`).
- Pendiente pedir a TI: hosting (Azure Static Web App), registro en Entra ID con asignación requerida, publicación en Teams, pipeline/ambientes, roles por grupos de Entra.
- **Reemplazado (16-10):** en vez de 6 preguntas, se envía la propuesta técnica construida (`docs/propuesta/`), con 15 puntos para revisar y tono colaborativo.

## 4. Documentos y datos creados
- Propuesta técnica para TI (PDF): `docs/propuesta/APIH_Corporativo_Propuesta_TI.pdf` (editable en Claude Docs de la cuenta de trabajo).
- Plan y brechas (Claude Docs, privado): https://claude.ai/artifact/2GquKhzaERtSspc3J9n8ay
- `docs/APIH_iniciativas_con_plan.json`: las 2 iniciativas con hitos y riesgos, listo para **Administración → Importar iniciativas** (el importador omite títulos que ya existen; si ya se cargó una versión previa, borrar y reimportar).
- Memoria del proyecto (claude.ai): `areas/apih.md`.
- **Registro de versiones:** `CHANGELOG.md` (raíz). **Decisiones:** `docs/decisiones/` (ADR-001…005).
- **Contrato de Iniciativa (para TI):** `packages/core/contracts/iniciativa.md` + `iniciativa.schema.json`.

## 5. Arquitectura del prototipo (para no redescubrirla)
- Un solo `index.html` (~1,4 MB, ~10.200 líneas), vistas con `Views.x`, acciones `Acts.x`, cambios `Chg.x`; render con `render()`; wrapper v22 post-render. Colecciones: ini, riesgos, hitos, decisiones, compromisos, cambios, notas, documentos, bitacora, comites. 22 vistas. CSP con `'unsafe-inline'`.
- Servicios: `AuthService` (provider msal|supabase), `DataService`, `SharePointService`, `SupabaseService extends SharePointService`. Config pública en `apih-config.js`; SQL en `supabase/apih_servidor.sql` (RLS, trigger de versión).
- `save()` → `audit()` (diff vs. baseline `audSnap`) → `DataService.commit()`. Historial por registro (`Edición` en bitácora), Notificaciones paramétricas (`NOTIF`, canales correo/Teams apagados), Calendario con modal de mes, panel contextual `pn-*`, menú lateral contraíble (`UI.rail`), Capacidad de equipos (`capData`), importadores (`impini`), **Completar con IA** por proyecto (`iapExport` / `Chg.proyiaf`, formato `apih-proyecto-ia`).
- Compuertas de fase: ver `gates()`. "Completado" solo en fase Cierre (`Acts.estado`). Roles: `rolActual()`, `puedeGobernar()`, `puedeEditarIni()`.
- Editar CSS: bloques de override antes de `/* ---------- V21: errores visuales ---------- */`; reglas posteriores necesitan prefijo `#main` o `!important`.

## 6. Pruebas
- Prototipo: `tests/e2e/` (Playwright sobre copia demo; ver su README). Regresión mínima: t10, t13, t43, t44, cap2, r1, c4, imp1, imp2, ia1.
- Corporativo (Node, sin dependencias): `node tests/unit/core-equivalencia.js` (core ≡ V22.52, 68.256 casos) y `node tests/contract/run.js` (esquema ↔ core, datos reales, 12 casos de contrato por adaptador).

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
| Envío | 16-10-2026: propuesta enviada a TI (versión en `docs/propuesta/APIH_Corporativo_Propuesta_TI_enviada_16-10-2026.pdf`, sin la nota de login en Teams del punto 6). Cambios posteriores se acumulan para una v2 que se envía solo si TI la pide o al responder sus comentarios |

Reglas clave: **el Prototipo no se toca; lo que se necesite se copia y sigue con versión C** (ADR-002). Cada componente declara la última versión C en que cambió (ADR-005).

## 7. Pendientes

**Versión final de APIH Corporativo (pedido del usuario, 16-10-2026; mockup antes de implementar):**
1. Propuestas con despliegue similar a proyectos: planificación en la ficha e hitos y riesgos en un mismo lugar.
2. Propuestas visibles en las vistas del menú Planificación (Gantt, Fases, Roadmap, Calendario, Hitos, Capacidad, Riesgos).
3. Categorías para hitos y riesgos, con filtro por categoría.

**Usuario:** enviar la propuesta al arquitecto de TI; que colegas creen contraseña individual y luego ejecutar SQL sección C (retirar la clave de equipo); importar las 2 iniciativas; (opcional) crear usuario "Bot IA" con rol Editor.
**Camino elegido: construir y proponer a TI.** Siguiente: enviar al arquitecto de TI (mismo hilo, la Dirección de TI en copia) el correo colaborativo con el PDF; comentarios de TI esperados hacia el 21-10 (sin presión); al habilitar dev, validar en Azure (`tests/contract/run-azure-sql.js`). Pendiente en core: `pasosDe` (V22.54); contratos propios para decisiones, compromisos, cambios, bitácora y comités., con equivalencia y pruebas de contrato. Objetivo del proyecto: demostrar que la metodología acelera los plazos (medir horas por versión).
**Hecho (C1.0–C1.3):** core de fechas/riesgo, contrato de Iniciativa, documentación del proceso.
**Limitaciones conocidas:** cfg/cfgU last-write-wins; "leído" de avisos solo por navegador; email/Teams requieren SMTP/webhook de TI; los tags `prototipo-v22.52-congelado` y `c1.x` pueden no subir (proxy): crear desde GitHub Releases; el push de tags/API de GitHub puede fallar en la sesión en la nube.
