# APIH — Documento de traspaso (15-10-2026 · Prototipo V22.52 · Corporativo C1.2)

Para retomar el trabajo en otra cuenta/sesión de Claude. Pega este archivo al inicio de la conversación y adjunta/clona el repo.

## 1. Quién y cómo trabajar
- **Christian Tolosa Delpino**, IT Business Partner BISE, Aramark Chile. Responder **en español**, conciso y técnico, ediciones quirúrgicas.
- Una acción del usuario a la vez. **Mockup antes de cambios grandes de layout.** Subir la etiqueta de versión (`VER` en index.html) en cada publicación.
- "Publica cada grupo apenas lo pruebes": rama por grupo → pruebas → merge a `main` → push. Terminar los mensajes de publicación con recordatorio **Ctrl+Shift+R**.
- **Nunca tocar secretos**: la clave `service_role` jamás en el repo; `apih-config.js` solo URL pública y anon key. No pedir ni guardar contraseñas.
- Commits terminan con las líneas de atribución de la sesión (Co-Authored-By / Claude-Session).
- No quiere reuniones con TI: todo **por correo, redactado con ayuda de Claude** (él lo envía desde su Outlook de Aramark; su Gmail conectado es personal: cetolosa@gmail.com, donde reenvía correos de trabajo).

## 2. Dos productos
| | APIH Prototipo | APIH Corporativo |
| --- | --- | --- |
| Estado | **Congelado en V22.52** (solo correcciones críticas y accesos) | En construcción, **C1.2** |
| Versionado | V22.x (no sube más) | **C<n>.<m>** — ver `CHANGELOG.md` |
| Arquitectura | SPA de un archivo + Supabase (interino) en GitHub Pages | 3 capas exigidas por TI: SPA + Entra ID, backend/API, Azure SQL |
| Repo | `Cetolosa/APIH` (raíz: index.html, apih-config.js, supabase/) | mismo repo, monorepo (carpetas vacías aún), luego repo de Aramark que indique TI |
| Salida | Se retira al entrar Corporativo | Producción objetivo **22-12-2026** (agresivo) |

Estructura objetivo del monorepo: `packages/core` (reglas puras), `packages/ui`, `packages/data-supabase`, `packages/data-azure`, `apps/prototipo`, `apps/corporativo`, `services/api`, `db/`, `tests/`. **El prototipo sigue siendo `/index.html`** (no mover: rompe GitHub Pages). Funciones diferidas del prototipo, a construir una sola vez en Corporativo: Pronóstico financiero, Ruta crítica, Escenarios.

## 3. Lo decidido con TI (correo "Registro de aplicación interna APIH en Entra ID", 11–14 oct)
- José Curihuinca (Software Architect) recomendó **3 capas**: SPA (Entra ID, publicable en Teams), Backend/API (seguridad, reglas, validaciones), **Azure SQL**. Vale aunque la solución sea temporal; sugirió el **mismo enfoque del Catálogo CMDB** (referencia existente).
- Jaime Bulo (Director TI) participa. Christian respondió que **aplaza producción** hasta entender seguridad, capa de servicios y persistencia.
- Obsoleto: listas SharePoint + `Sites.Selected` (con Azure SQL, Graph se reduce a `User.Read`).
- Pendiente pedir a TI: hosting (Azure Static Web App), registro en Entra ID con asignación requerida, publicación en Teams, pipeline/ambientes, roles por grupos de Entra.
- **Siguiente acción de Christian:** enviar a José el correo (sin reunión) con 6 preguntas: documentación/repo del CMDB, stack del backend, cómo se solicita Azure SQL, hosting + pipeline dev/qa/prod, roles con grupos de Entra, sideloading en Teams. (Borrador en la conversación; hito "Respuestas de José por correo" 23-10.)

## 4. Documentos y datos creados
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
| C1.2 | CHANGELOG, ADR, este traspaso, tags |

Reglas clave: **el Prototipo no se toca; lo que se necesite se copia y sigue con versión C** (ADR-002). Cada componente declara la última versión C en que cambió (ADR-005).

## 7. Pendientes
**Usuario:** enviar correo a José; que colegas creen contraseña individual y luego ejecutar SQL sección C (retirar la clave de equipo); importar las 2 iniciativas; (opcional) crear usuario "Bot IA" con rol Editor.
**Claude, siguiente (C1.3):** contratos de Hitos y Riesgos + compuertas de fase (`gates()` de V22.52) en core, con equivalencia y pruebas de contrato. Opcional: correo a José con las 6 preguntas adjuntando `contracts/iniciativa.md` como propuesta de backend.
**Hecho (C1.0–C1.2):** core de fechas/riesgo, contrato de Iniciativa, documentación del proceso.
**Limitaciones conocidas:** cfg/cfgU last-write-wins; "leído" de avisos solo por navegador; email/Teams requieren SMTP/webhook de TI; los tags `prototipo-v22.52-congelado` y `c1.x` pueden no subir (proxy): crear desde GitHub Releases; el push de tags/API de GitHub puede fallar en la sesión en la nube.
