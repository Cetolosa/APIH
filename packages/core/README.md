# packages/core — APIH Corporativo

Reglas puras (sin DOM ni estado global). Script clásico: navegador (`window.APIHCore`) y Node (`require`).

## Versionado
- El Corporativo se versiona como **C<n>.<m>**, independiente de las V22.x del Prototipo.
- El Prototipo (`/index.html`, V22.52) **no se toca**. Si algo de él se necesita, se **copia** aquí y continúa con versión C.
- Cada cambio sube `VERSION` en `apih-core.js` y agrega una línea en el registro.

## Registro
| Versión | Fecha | Cambio |
| --- | --- | --- |
| C2.11 | 17-10-2026 | Categorías de hito (`HITO.HITO_CATS`, `validarHito`), subfases (`validarSubfases`, `validarHitoSubfase`); de V22.55–V22.56. |
| C1.4 | 16-10-2026 | Hitos, riesgos, compuertas (`gates`) y ventanas de fase, con dependencias por parámetro; equivalentes a V22.54. |
| C1.1 | 15-10-2026 | Contrato de Iniciativa: `contracts/iniciativa.schema.json` (58 campos), `contracts/iniciativa.md` (8 operaciones, 10 reglas, errores, REST sugerido), `validarIniciativa`, `validarCambioEstado`, `hayCiclo`, `INICIATIVA`. Pruebas de contrato reutilizables por adaptador (`tests/contract/`). |
| C1.0 | 15-10-2026 | Fechas (`pad`, `toISO`, `pD`, `addD`, `diffD`) y riesgo (`expo`, `nivelRiesgo(e, umbral)`, `riesgoAbierto`) copiadas de V22.52. `nivelRiesgo` recibe el umbral por parámetro. |

## Pruebas
`node tests/contract/run.js` — esquema ↔ core, datos reales de `docs/` y contrato por adaptador (hoy: memoria).
`node tests/unit/core-equivalencia.js` y `node tests/unit/core-equivalencia-c14.js` — compara contra las funciones de `index.html` V22.52 (solo lectura).
