# APIH · Power BI — C2.10

Modelo de reportes sobre Azure SQL, en vistas de solo lectura del esquema `rpt` (`db/azure-sql/003_reportes.sql`). Power BI nunca lee las tablas de la aplicación ni pasa por la API.

## 1. Preparación (una vez, en la base)
1. Ejecutar `003_reportes.sql` como administrador Entra de la base. Es idempotente y no cambia las tablas.
2. TI crea los grupos **APIH-Reportes** (sin montos) y **APIH-Reportes-Finanzas** (montos) y ejecuta los `GRANT` del final del script. Quien deba ver montos queda en ambos grupos.

## 2. Conexión (Power BI Desktop)
1. Obtener datos → **Azure SQL Database**. Servidor `<servidor>.database.windows.net`, base `apih`, modo **Importar**.
2. Autenticación: **Cuenta Microsoft (Entra ID)** con la cuenta Aramark. No hay usuarios SQL.
3. Seleccionar las vistas del esquema `rpt`.

| Vista | Tipo | Clave | Relación |
| --- | --- | --- | --- |
| `dim_iniciativa` | Dimensión | `id` | — |
| `puente_area` | Puente | `ini` | `ini` → `dim_iniciativa[id]` (muchos a uno; filtro en ambas direcciones si se filtra por área) |
| `fact_hitos` | Hecho | `id` | `ini` → `dim_iniciativa[id]` |
| `fact_riesgos` | Hecho | `id` | `ini` → `dim_iniciativa[id]` |
| `fact_avance` | Hecho | — | `ini` → `dim_iniciativa[id]`; `fecha` → `Calendario[Fecha]` |
| `fact_tramos` | Hecho | — | `ini` → `dim_iniciativa[id]`; `desde` → `Calendario[Fecha]` |
| `fact_decisiones`, `fact_compromisos`, `fact_cambios` | Hecho | `id` | `ini` → `dim_iniciativa[id]` |
| `fact_finanzas` | Hecho (Confidencial) | `ini` | `ini` → `dim_iniciativa[id]` (uno a uno) |
| `parametros` | Auxiliar | — | Sin relación (fecha de hoy en Chile y umbral crítico) |

4. Crear la tabla `Calendario` y las medidas de `medidas.dax`.

## 3. Páginas sugeridas
| Página | Contenido |
| --- | --- |
| Portafolio | Tarjetas: proyectos y propuestas vigentes, % en rojo, sin actualizar, avance promedio. Matriz por área y fase. |
| Plan | Hitos vencidos y por vencer por proyecto y responsable; curva de avance (`fact_avance`) |
| Riesgos | Matriz probabilidad × impacto, críticos y sin mitigación, por dueño |
| Gobierno | Decisiones y compromisos vencidos, cambios por estado y días de resolución |
| Tiempos | Días promedio por fase (`fact_tramos`), embudo de propuestas y tasa de aprobación |
| Finanzas (restringida) | Presupuesto, gastado, % ejecutado, beneficio y ahorro. Publicar en un informe aparte para el grupo de Finanzas |

## 4. Publicación y actualización
- Publicar en un área de trabajo de Power BI que defina TI. Azure SQL no requiere gateway.
- Actualización programada: 1–2 veces al día con credenciales OAuth2 de una cuenta de servicio o del dueño del conjunto de datos, según la política de TI.
- Seguridad por área (opcional): rol RLS en Power BI filtrando `puente_area[area]` según el usuario. Requiere una tabla de usuarios y áreas; puede agregarse a `rpt` si TI lo pide.

## 5. Notas
- Los estados de hito y niveles de riesgo siguen las mismas reglas que la app (`packages/core`). El umbral crítico es el de la organización; la app permite umbrales por líder.
- `fact_tramos` sale del historial automático de Azure SQL, así que solo muestra lo ocurrido desde la puesta en marcha. La historia previa del Prototipo está en `fact_avance` (historial de avance migrado) y en `creada` / `fase_desde`.
- Pendiente de validar en dev: ejecutar el script y abrir el modelo con datos migrados (en este entorno no hay SQL Server ni Power BI Desktop).
