# APIH Corporativo · Procedimientos de operación (runbook) — C2.9

Borrador para acordar con TI (**punto 14** de la propuesta: operación y soporte). Las responsabilidades marcadas «propuesta» se confirman con TI antes de producción.

## 1. Componentes
| Componente | Recurso Azure | Notas |
| --- | --- | --- |
| Aplicación web | Static Web App (Standard) | Inicio de sesión Entra ID, rutas por rol (`staticwebapp.config.json`) |
| API | Function App (Node 20) con identidad administrada | Reglas de negocio; envío programado de avisos |
| Base de datos | Azure SQL, solo Entra ID | Historial automático (tablas temporales), auditoría a Log Analytics |
| Monitoreo | Application Insights + Log Analytics | Errores, tiempos de respuesta, auditoría SQL |
| Despliegue | GitHub Actions con OIDC | Pruebas → dev → prod; sin secretos en el repositorio |

## 2. Responsabilidades (propuesta)
| Actividad | Sistemas BISE | TI |
| --- | --- | --- |
| Alta y baja de usuarios en grupos APIH-* | Solicita | Ejecuta (o delega la membresía) |
| Rol y área dentro de APIH | Ejecuta | — |
| Parámetros, catálogos y notificaciones | Ejecuta | — |
| Desarrollo, pruebas y despliegue de versiones | Ejecuta | Aprueba el paso a prod |
| Monitoreo de disponibilidad y alertas | Recibe alertas funcionales | Recibe alertas de plataforma |
| Incidentes de aplicación (errores, datos) | Atiende | Apoya |
| Incidentes de plataforma (Azure, red, identidad) | Informa | Atiende |
| Restauración de base de datos | Solicita y valida | Ejecuta |
| Rotación del secreto de Entra ID | Recuerda la fecha | Ejecuta |

## 3. Verificación diaria y salud
- `GET https://<app>/api/salud` → `{ ok: true }`. El pipeline lo comprueba en cada despliegue.
- Alertas recomendadas en Application Insights:
  - tasa de errores 5xx > 2 % en 15 minutos;
  - disponibilidad de `/api/salud` < 99 %;
  - falla de la función `apih-notificaciones`.
- Revisar semanalmente: errores frecuentes, consultas lentas (Azure SQL → Query Performance Insight) y espacio de la base.

## 4. Usuarios
**Alta:**
1. TI agrega la cuenta al grupo de Entra que corresponda (APIH-Admin, APIH-Editor o APIH-Lectura).
2. Sistemas BISE la registra en APIH → Administración → Usuarios, con rol, área y correo.

**Baja:**
1. TI la quita del grupo; el acceso se corta en el siguiente inicio de sesión.
2. Sistemas BISE la quita de Usuarios y reasigna sus iniciativas.

**Revisión trimestral:** contrastar los miembros de los grupos con la lista de usuarios de APIH.

## 5. Incidentes
| Severidad | Ejemplo | Respuesta objetivo |
| --- | --- | --- |
| 1 · Crítica | Nadie puede entrar; pérdida o corrupción de datos | Inmediata; aviso a usuarios |
| 2 · Alta | Una función clave falla (guardar, cambiar fase) | Mismo día hábil |
| 3 · Media | Una vista o exportación con error, con alternativa | 3 días hábiles |
| 4 · Baja | Detalle visual o mejora | Próxima versión |

**Pasos:**
1. Reproducir y capturar el error. La respuesta 500 trae un mensaje genérico; el detalle está en Application Insights por hora y operación.
2. Clasificar: aplicación (Sistemas BISE) o plataforma (TI).
3. Si el problema viene de una versión recién desplegada, volver a la versión anterior (sección 7).
4. Registrar la causa y la solución en el registro de cambios de la versión que lo corrige.

## 6. Respaldo y restauración
- Azure SQL guarda copias automáticas con restauración a un punto en el tiempo (PITR, 7 días por defecto). Recomendación para prod: 14–35 días y retención de largo plazo semanal, a definir con TI.
- Además, el historial de cada registro queda en tablas temporales: un registro modificado por error se recupera sin restaurar toda la base.

**Restaurar la base completa (TI):**
1. Restaurar a una base nueva en el mismo servidor, en el punto anterior al incidente.
2. Sistemas BISE valida los datos en la base restaurada.
3. Cambiar `APIH_SQL_DB` de la Function App a la base restaurada, o renombrar las bases.
4. Verificar `/api/salud` y los casos A1, D1 y V1 del guion de UAT.

**Respaldo funcional adicional:** un Admin puede exportar «Respaldo JSON» desde Administración. Conviene hacerlo antes de cada carga masiva.

## 7. Despliegues y vuelta atrás
- Cada versión C se publica con su rama, sus pruebas y su entrada en `CHANGELOG.md`. El pipeline ejecuta todas las pruebas antes de desplegar.
- **Vuelta atrás:** volver a desplegar la versión anterior (re-ejecutar el pipeline sobre su commit).
- Los cambios de esquema SQL son aditivos (columnas calculadas y vistas), así que la versión anterior sigue funcionando con la base nueva.
- **Cambios en las reglas de avisos:** regenerar el motor con `node tools/generar-motor-notif.js`. Si se olvida, el pipeline falla.

## 8. Notificaciones
- Activación: `APIH_NOTIF_CANALES` (`correo`, `teams` o ambos), además de `APIH_CORREO_REMITENTE` o `APIH_TEAMS_WEBHOOK`. Sin valor, solo hay avisos en la app.
- Antes de activar, un Admin ejecuta `POST /api/notificaciones/despachar` (simula) y revisa a quién se enviaría.
- Cada aviso se envía una vez por persona y canal; lo enviado queda en la lista `APIH_NotifEnviadas`.
- Personas sin correo en Usuarios no reciben avisos externos; aparecen como «omitidos» en el resultado.

## 9. Tareas periódicas
| Frecuencia | Tarea | Responsable |
| --- | --- | --- |
| Semanal | Revisar errores y alertas | Sistemas BISE |
| Trimestral | Revisión de accesos (sección 4) | Sistemas BISE + TI |
| Anual | Rotar el secreto de Entra ID de la Static Web App (vence al año) | TI |
| Por versión | Actualizar `CHANGELOG.md` y `docs/HANDOFF.md` | Sistemas BISE |

## 10. Paso a producción y retiro del Prototipo
1. Congelar la edición en el Prototipo (aviso a usuarios con fecha y hora).
2. Exportar «Respaldo JSON» del Prototipo.
3. «Importar respaldo» en APIH Corporativo (prod), como Admin, y revisar los rechazos informados.
4. Validar con los casos D1 y V1 del guion de UAT.
5. Comunicar la nueva dirección. El Prototipo queda solo lectura hasta su retiro (03-12) y luego se desactiva su base en Supabase, previo respaldo final.
