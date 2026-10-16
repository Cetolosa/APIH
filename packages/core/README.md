# packages/core — APIH Corporativo

Reglas puras (sin DOM ni estado global). Script clásico: navegador (`window.APIHCore`) y Node (`require`).

## Versionado
- El Corporativo se versiona como **C<n>.<m>**, independiente de las V22.x del Prototipo.
- El Prototipo (`/index.html`, V22.52) **no se toca**. Si algo de él se necesita, se **copia** aquí y continúa con versión C.
- Cada cambio sube `VERSION` en `apih-core.js` y agrega una línea en el registro.

## Registro
| Versión | Fecha | Cambio |
| --- | --- | --- |
| C1.0 | 15-10-2026 | Fechas (`pad`, `toISO`, `pD`, `addD`, `diffD`) y riesgo (`expo`, `nivelRiesgo(e, umbral)`, `riesgoAbierto`) copiadas de V22.52. `nivelRiesgo` recibe el umbral por parámetro. |

## Pruebas
`node tests/unit/core-equivalencia.js` — compara contra las funciones de `index.html` V22.52 (solo lectura).
