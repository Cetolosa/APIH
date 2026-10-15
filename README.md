# APIH — Aramark Portfolio Intelligence Hub

Dos productos sobre un núcleo compartido:

- **APIH Prototipo**: SPA + Supabase (interino). Hoy vive en `/index.html` y se publica en GitHub Pages.
- **APIH Corporativo**: SPA + Entra ID + API + Azure SQL (arquitectura de 3 capas de TI). Stack del backend por definir por TI.

## Estructura objetivo
| Carpeta | Contenido |
| --- | --- |
| `packages/core` | Reglas puras (esperado, RAG, capacidad, avisos, auditoría, roles) |
| `packages/ui` | Vistas y componentes; usan `core` y la interfaz `DataPort` |
| `packages/data-supabase` | Adaptador `DataPort` → Supabase |
| `packages/data-azure` | Adaptador `DataPort` → API corporativa |
| `apps/prototipo`, `apps/corporativo` | Ensamblado de cada producto |
| `services/api` | Backend corporativo (stack por definir) |
| `db/supabase`, `db/azure-sql` | Esquemas y migraciones |
| `tests` | Unitarios, contrato y e2e |

## Estado
Fase 1 del plan (dividir `index.html` en `core` + `ui`) pendiente. Mientras tanto `/index.html`, `/apih-config.js` y `/supabase` siguen siendo la fuente y no se mueven, para no romper GitHub Pages.
