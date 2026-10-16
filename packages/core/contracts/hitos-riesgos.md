# Contrato de Hitos y Riesgos — C1.4

Mismas convenciones que [iniciativa.md](iniciativa.md): `version` para concurrencia, errores `{codigo, mensaje, detalles}`, campos readOnly sellados por el servidor.
Datos: [`hito.schema.json`](hito.schema.json), [`riesgo.schema.json`](riesgo.schema.json). Reglas: `APIHCore.validarHito`, `validarRiesgo`.

## Operaciones
| Operación | REST sugerido | Notas |
| --- | --- | --- |
| `listarHitos(ini)` / `listarRiesgos(ini)` | `GET /iniciativas/{id}/hitos` · `/riesgos` | |
| `crearHito(datos)` / `crearRiesgo(datos)` | `POST /iniciativas/{id}/hitos` · `/riesgos` | id `HIT-n` / `RSK-n` |
| `actualizarHito(id, cambios, version)` / `actualizarRiesgo(...)` | `PATCH /hitos/{id}` · `/riesgos/{id}` + `If-Match` | |
| `completarHito(id, fechaReal?, version)` | `POST /hitos/{id}/completar` | fechaReal = hoy si no viene |
| `eliminarHito` / `eliminarRiesgo` | `DELETE` + `If-Match` | |
| `compuerta(ini, fase)` | `GET /iniciativas/{id}/compuerta?fase=` | resultado de `gates()` |
| `fases(ini)` | `GET /iniciativas/{id}/fases` | resultado de `fasesVentana()` |

## Reglas (servidor)
1. Hito: `ini`, `nombre`, `fecha` obligatorios; `fase` vacía o válida; si `completado`, `fechaReal` obligatoria (el servidor la pone en hoy si falta).
2. Riesgo: `prob` e `imp` enteros 1–5; `estado` y `cat` de las listas; **riesgo abierto con exposición ≥ umbralCritico exige `mit`**.
3. `cambiarFase` (contrato de Iniciativa) aplica `gates()`: si hay condiciones no cumplidas responde `COMPUERTA` con `detalles` = condiciones.
4. `gates`, `fasesVentana` y `hitoEstado` del core son la única fuente de verdad; equivalentes a V22.54 (`tests/unit/core-equivalencia-c14.js`).
