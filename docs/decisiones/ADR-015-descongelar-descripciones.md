# ADR-015 · Descongelar el Prototipo: descripción en fases, subfases e hitos (V22.61)
**Fecha:** 17-10-2026 · **Decidió:** Christian Tolosa · **Estado:** Vigente · **Reabre:** el Prototipo (congelado en V22.60, ADR-014)

**Contexto.** El usuario pidió poder adjuntar una descripción/instrucciones a cada objeto de planificación, usada sobre todo en Mi cocina como recordatorio.
**Decisión.** Se descongela el Prototipo para esta mejora. Cada objeto puede llevar un texto libre (≤ 500 caracteres):
- **Fase:** descripción **global** en Administración → Metodología (`m.faseDesc[fase]`) **más** una **nota por proyecto** (`i.faseNota[fase]`) que la complementa. En Mi cocina y en la visualización se muestran combinadas.
- **Subfase:** campo `desc` en el formulario de subfase.
- **Hito:** campo `desc` en el formulario de hito.
**Dónde se ve.** Mi cocina (banda bajo cada paso: la del hito incluye la de su subfase; la del paso de compuerta trae la de la fase). También en la ficha y en Planificación → Fases (línea e indicador con tooltip). Se edita en cada formulario, y la nota de fase por proyecto desde la ficha › Planificación.
**Datos.** Todo viaja en la iniciativa/hito (sin cambios de esquema de almacenamiento). Importar iniciativas y «Completar con IA» leen y escriben `hitos[].desc`, `subfases[].desc`, `faseNota` y `notas_de_fase`; el respaldo completo las incluye.
**Validación.** Core C2.17 valida los largos (≤ 500) y que las claves de `faseNota` sean fases del tipo; la API los aplica. Texto escapado en todas las vistas (e2e `desc1`, `xss1`).
**Cierre.** El Prototipo queda **abierto** (V22.61). Se congela cuando el usuario lo pida.
