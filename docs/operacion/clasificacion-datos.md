# APIH Corporativo · Clasificación de datos (borrador) — C2.9

Borrador para el **punto 15** de la propuesta. Los niveles se ajustan a la política de clasificación de información de Aramark que indique TI. Mientras tanto se usa una escala genérica: Pública · Interna · Confidencial · Restringida.

## Propuesta general
**Interna**, con algunos campos **Confidenciales** (montos y evaluaciones). APIH no guarda datos personales sensibles, ni datos de clientes o comensales, ni información de pago.

## Inventario
| Conjunto | Contenido | Datos personales | Nivel propuesto |
| --- | --- | --- | --- |
| Iniciativas (propuestas y proyectos) | Título, descripción, caso de negocio, objetivos, fase, estado, avance, fechas, área, prioridad, puntaje | Nombres de líder, sponsor, solicitante y negocio | Interna |
| Datos económicos de iniciativas | Presupuesto, gastado, beneficio, ahorro, folio, orden de compra, proveedor, contrato | — | **Confidencial** |
| Hitos | Nombre, fase, fecha, estado | Responsable | Interna |
| Riesgos | Descripción, probabilidad, impacto, mitigación | Dueño | Interna (Confidencial si describe proveedores o montos) |
| Decisiones, compromisos, cambios, comités | Gobierno del portafolio | Solicitante, aprobador, responsables, participantes | Interna |
| Notas y bitácora | Comentarios y registro de cambios | Autor | Interna |
| Documentos | Enlaces a OneDrive o SharePoint (el contenido no se guarda en APIH) | — | Interna; el documento conserva su propia clasificación |
| Usuarios de APIH | Nombre, correo corporativo, rol, área, cargo | Sí, de colaboradores | Interna |
| Notificaciones enviadas | Persona, canal, tipo de aviso, fecha | Sí | Interna |
| Registros técnicos | Auditoría SQL, Application Insights | Correo del usuario en operaciones | Interna (acceso solo TI y Sistemas BISE) |

## Datos personales
- Solo de colaboradores de Aramark: nombre, correo corporativo, cargo y área, para asignar responsabilidades y avisos.
- Base legal: relación laboral y gestión interna. No hay perfiles ni decisiones automatizadas sobre personas.
- **Minimización:** no se guardan RUT, teléfonos personales ni datos de salud o remuneraciones.

## Controles por nivel
| Control | Interna | Confidencial |
| --- | --- | --- |
| Acceso | Cuenta Aramark en grupos APIH-* | Igual y, si TI lo pide, solo roles Gasto/Administrador ven montos (filtro en la API) |
| Cifrado | En tránsito (TLS 1.2+) y en reposo (TDE) | Igual |
| Trazabilidad | Historial por registro y auditoría SQL | Igual |
| Exportación | Excel y presentaciones con la marca de la app | Recordar en la exportación que contiene montos |
| Ubicación | Región de Azure que defina TI (punto 10) | Igual |

## Retención (propuesta)
- Iniciativas y su gobierno: mientras la iniciativa esté vigente, más 5 años desde su cierre.
- Historial temporal y auditoría: 2 años en prod, ajustable a la política de TI.
- Notificaciones enviadas: 12 meses.
- Usuarios dados de baja: se conserva el nombre en los registros históricos por trazabilidad; se quita el correo y el acceso.

## Para decidir con TI
1. Nivel oficial según la política de Aramark.
2. Si los montos requieren ocultarse a roles de solo lectura.
3. Plazos de retención y si aplica retención legal de largo plazo.
4. Región de Azure para los datos.
