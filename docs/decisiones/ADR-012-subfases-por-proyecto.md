# ADR-012 · Excepción: Subfases por proyecto (V22.55)
**Fecha:** 16-10-2026 · **Versión:** Prototipo V22.55 · **Decidió:** Christian Tolosa · **Estado:** Vigente · **Modifica:** ADR-002

**Contexto.** Las fases (Metodología) son globales: un proyecto no podía tener etapas propias sin afectar a todos.
**Decisión.** Tercera excepción al congelamiento, con mockup aprobado: cada proyecto puede crear **subfases** anidadas dentro de las fases obligatorias.
**Reglas.** (1) Una subfase pertenece a **una sola** fase obligatoria. (2) **Nace con fecha:** si inicio o fin quedan vacíos, hereda el inicio y fin de su fase. (3) **No puede extenderse fuera** del inicio y fin de su fase (no se guarda). (4) Un hito puede asignarse a una subfase solo si es de la misma fase; si su fecha queda fuera de la subfase, se avisa sin bloquear. (5) Donde se muestra la fase de un proyecto, se muestra con su **inicio y fin** (`faseTag`) y la subfase en curso.
**Fechas de la fase.** Se usan las ventanas de V22.53 (`fasesVentana`): desde el día siguiente al fin de la fase anterior hasta su último hito. Si la ventana cambia después (p. ej. se mueve un hito), la subfase que quede fuera se marca en rojo «Fuera de la fase».
**Datos.** `i.subfases = [{ id: '<ini>-SF<n>', nombre, fase, inicio, fin, resp }]` dentro de la iniciativa (viaja en DatosJSON, sin cambios de esquema); el hito guarda `h.subfase`.
**Dónde se ve.** Ficha (cabecera, Planificación, tabla de hitos), panel, Proyectos (tabla y tablero), Fases (Gantt, Línea, Tablero) y formulario de hito.
**Pendiente.** Importador/exportador JSON e IA aún no leen ni escriben subfases. Llevar las reglas al core del Corporativo (`validarSubfase`) con equivalencia.
