# Contrato de Iniciativa — C1.1

Independiente del stack. La UI usa solo la interfaz **DataPort**; cada adaptador (`data-supabase`, `data-azure`, memoria para pruebas) la implementa y debe pasar `tests/contract/`.
Datos: [`iniciativa.schema.json`](iniciativa.schema.json). Reglas entre campos: `APIHCore.validarIniciativa()`.

## Operaciones

| Operación | Entrada | Salida | Errores | REST sugerido (para TI) |
| --- | --- | --- | --- | --- |
| `listar(filtro?)` | `{ tipo?, fase?, estado?, area?, texto? }` | `Iniciativa[]` | — | `GET /iniciativas?tipo=&fase=…` |
| `obtener(id)` | id | `Iniciativa` | `NO_ENCONTRADA` | `GET /iniciativas/{id}` |
| `crear(datos)` | Iniciativa sin campos readOnly | `Iniciativa` (con id, version) | `INVALIDA`, `SIN_PERMISO` | `POST /iniciativas` |
| `actualizar(id, cambios, version)` | cambios parciales + version leída | `Iniciativa` | `NO_ENCONTRADA`, `INVALIDA`, `CONFLICTO`, `SIN_PERMISO` | `PATCH /iniciativas/{id}` + `If-Match: version` |
| `cambiarEstado(id, {estado, motivo?, rev?}, version)` | ver reglas | `Iniciativa` | ídem | `POST /iniciativas/{id}/estado` |
| `cambiarFase(id, fase, version)` | fase siguiente/anterior | `Iniciativa` | ídem + `COMPUERTA` | `POST /iniciativas/{id}/fase` |
| `aprobarPropuesta(id, version)` | id PROP en fase Aprobación | `{ propuesta, proyecto }` | ídem + `COMPUERTA` | `POST /iniciativas/{id}/aprobar` |
| `eliminar(id, version)` | — | — | `NO_ENCONTRADA`, `CONFLICTO`, `SIN_PERMISO` | `DELETE /iniciativas/{id}` + `If-Match` |

Todas son asíncronas (devuelven `Promise`).

## Reglas (las aplica el servidor; la UI las repite para avisar antes)
1. `id`: si no viene, lo asigna el servidor (`PROP-n` o `PRJ-n` según `tipo`); si el cliente lo propone (C2.2, compatibilidad con la SPA), debe tener el prefijo del tipo y no existir (si existe → `CONFLICTO`). `tipo` no cambia después de crear.
2. Fase y estado deben ser del tipo (Propuesta / Proyecto).
3. Estados `En espera`, `Pausado`, `Stand By`, `Rechazada`, `Retirada`, `Cancelado` exigen `estadoMotivo`; `En espera` y `Pausado` exigen `estadoRev` (`Stand By` no). `Stand By` no es final: se reactiva a `En curso` / `Vigente`, y la iniciativa sale de indicadores, avisos y presentación.
4. `Completado` solo en fase `Cierre`. `Aprobada` vía `aprobarPropuesta`, o (C2.2) creando primero el `PRJ` con `propuestaOrigen` (exige propuesta vigente en fase Aprobación) y luego `cambiarEstado` a `Aprobada`.
5. `finPlan >= inicioPlan`; `finReal >= inicioReal`.
6. `deps` sin ciclos ni referencia a sí misma.
7. Crear un Proyecto directo (sin propuesta) con `origen` = `usuario` (o vacío) exige `motivoAlta`. Las importaciones (`origen` = `importación`) están exentas, igual que en V22.52.
8. Concurrencia optimista: si `version` no coincide con la actual → `CONFLICTO` (hoy: columna `actualizado` en Supabase).
9. `modificadoPor`, `actualizada`, `version` los sella el servidor con la identidad del token (Entra ID).
10. Estados finales (`Aprobada`, `Rechazada`, `Retirada`, `Completado`, `Cancelado`) no admiten más cambios de estado.
11. (C2.6) Migración desde el Prototipo: `crear` con `x-apih-migracion: 1`, solo Admin, conserva `creada`, `faseDesde`, `hist` y `actualizada`, no exige `propuestaOrigen` vigente y marca `origenMigracion = prototipo`. El resto de reglas se valida igual.

## Errores
`{ codigo, mensaje, detalles?: [{ campo, regla }] }` — `codigo` ∈ `NO_ENCONTRADA` (404), `INVALIDA` (422), `CONFLICTO` (409), `SIN_PERMISO` (403), `COMPUERTA` (422, `detalles` = compuertas no cumplidas).

## Fuera de C1.1
Hitos, riesgos, decisiones y bitácora (contratos propios, C1.2+). Las compuertas de fase (`gates()`) dependen de hitos/riesgos: se definen junto con esos contratos; aquí solo se reserva el error `COMPUERTA`.
