# APIH Corporativo · Guion de pruebas de usuario (UAT) — C2.9

**Cuándo:** hito «Pruebas de usuario (UAT) y migración final de datos», en el ambiente **dev** de Azure con datos migrados del Prototipo.
**Quiénes:** Sistemas BISE (un usuario por rol) y, si TI lo desea, un observador de TI.
**Cómo registrar:** marcar cada caso como ✅ OK, ⚠️ Observación o ❌ Falla. Toda falla se anota en la tabla de incidencias del final con su caso, pasos y captura.

**Criterio de aceptación para pasar a producción:** 0 fallas abiertas en casos **Críticos** y observaciones con fecha de solución acordada.

## Preparación
| # | Tarea | Responsable |
| --- | --- | --- |
| P1 | Ambiente dev desplegado (SWA + API + Azure SQL) y `/api/salud` responde `ok` | Sistemas BISE + TI |
| P2 | Grupos APIH-Admin, APIH-Editor y APIH-Lectura con al menos un usuario de prueba cada uno | TI |
| P3 | Migración de prueba: respaldo JSON del Prototipo cargado con «Importar respaldo» | Sistemas BISE |
| P4 | En Administración → Usuarios, cada usuario de prueba tiene rol y área de APIH | Sistemas BISE |

## Casos
| ID | Prioridad | Rol | Caso | Pasos | Resultado esperado | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Crítico | Todos | Inicio de sesión | Abrir la URL de APIH con cuenta Aramark | Entra con la cuenta corporativa, sin pedir otra contraseña | |
| A2 | Crítico | — | Acceso denegado | Abrir con una cuenta Aramark que no está en los grupos APIH | Página «sin acceso»; no ve datos | |
| A3 | Crítico | Lectura | Solo lectura | Intentar editar una iniciativa, un hito y un riesgo | La app no permite guardar; la API rechaza el cambio | |
| A4 | Crítico | Editor | Edición permitida | Editar el avance de un proyecto y guardar | Se guarda; «Modificado por» muestra al usuario | |
| A5 | Alto | Admin | Roles y menús | Revisar los menús con cada rol de APIH (Gasto, Administrador, Colaborador, Invitado) | Cada rol ve su menú; Administración solo para administradores | |
| D1 | Crítico | Admin | Migración completa | Comparar 3 iniciativas del Prototipo con APIH Corporativo: datos, historial de avance, hitos, riesgos, decisiones y bitácora | Coinciden; los rechazos (si hubo) quedaron informados con su motivo | |
| D2 | Alto | Editor | Crear propuesta | Nuevo → Propuesta, completar campos obligatorios | Se crea con id PROP-n | |
| D3 | Crítico | Editor | Validaciones | Guardar un proyecto con fin plan anterior al inicio, o un estado «En espera» sin motivo | Mensaje claro; no se guarda | |
| D4 | Crítico | Editor | Cambio de fase con compuertas | Avanzar un proyecto de fase sin cumplir sus compuertas | La app muestra qué falta; el servidor no deja avanzar | |
| D5 | Alto | Editor | Aprobar propuesta | Propuesta en fase Aprobación → Aprobar | Se crea el proyecto vinculado; la propuesta queda «Aprobada» | |
| D6 | Alto | Editor | Hitos | Crear, editar, completar y eliminar un hito | Fechas y estado correctos en ficha, Gantt y Fases | |
| D7 | Alto | Editor | Riesgos | Crear un riesgo con probabilidad 5 e impacto 4 | Aparece como crítico en Riesgos y en el Dashboard | |
| D8 | Crítico | Editor ×2 | Edición simultánea | Dos usuarios editan la misma iniciativa; ambos guardan | El segundo recibe aviso de conflicto y ve los datos vigentes; nada se pierde sin aviso | |
| D9 | Medio | Editor | Gobierno | Registrar decisión, compromiso, solicitud de cambio y acta de comité | Se guardan y aparecen en sus vistas | |
| D10 | Medio | Admin | Historial | Abrir el historial de una iniciativa editada en D4/D6 | Muestra quién cambió qué y cuándo | |
| V1 | Alto | Todos | Vistas | Recorrer Dashboard, Mi cocina, Tabla, Tablero, Gantt, Fases, Roadmap, Calendario, Hitos, Riesgos | Cargan sin errores y con los mismos números que el Prototipo para los datos migrados | |
| V2 | Medio | Editor | Presentaciones | Generar una presentación de un proyecto | Se descarga y abre correctamente | |
| V3 | Medio | Editor | Exportar | Exportar la tabla de iniciativas a Excel | El archivo abre y trae los filtros aplicados | |
| N1 | Alto | Editor | Avisos en la app | Dejar un hito vencido y revisar la campana | Aparece el aviso «Hito vencido» | |
| N2 | Alto | Admin | Envío de avisos (simulado) | Ejecutar `POST /api/notificaciones/despachar` (simula) | Lista a quién se enviaría y por qué canal, sin enviar | |
| N3 | Medio | Admin | Envío real (si TI habilitó canal) | Ejecutar con `?simular=0` | Llega un resumen por persona; una segunda ejecución no repite avisos | |
| I1 | Medio | Editor | Completar con IA | Exportar un proyecto para IA, usar la IA corporativa e importar la respuesta | Vista previa de cambios; al confirmar se enriquecen los datos | |
| S1 | Alto | — | Datos fuera de la app | Llamar a `/api/iniciativas` sin sesión | 401, sin datos | |
| S2 | Medio | Todos | Desempeño | Abrir el Dashboard con todos los datos migrados | Carga en menos de 5 segundos | |
| S3 | Medio | Todos | Navegadores | Repetir A1, V1 en Edge y Chrome | Funciona igual | |
| T1 | Bajo | Todos | Teams (si TI lo publica) | Abrir APIH desde Teams | Inicia sesión en ventana aparte y carga la app | |

## Incidencias
| N.º | Caso | Descripción | Severidad | Responsable | Fecha solución | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

## Cierre
| Rol | Nombre | Resultado | Fecha |
| --- | --- | --- | --- |
| Sistemas BISE | | | |
| TI (opcional) | | | |
