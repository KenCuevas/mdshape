# Epica: statistics

Indicadores del negocio. Ocho de los quince endpoints estan reservados al plan Pro, y esa
comprobacion se hace en cada peticion contra el plan guardado en la empresa.

**Endpoints:** quince bajo `/api/v1/statistics`, todos con `@PreAuthorize("hasRole('OWNER')")`

| Disponibles con cualquier plan | Reservados al plan Pro |
| :--- | :--- |
| `/appointments/summary` | `/revenue/summary` |
| `/appointments/completion-rate` | `/services/most-booked` |
| `/next-available` | `/lost-revenue` |
| `/no-show/by-client` | `/occupancy` |
| `/no-show/by-day-of-week` | `/appointments/by-hour` |
| `/clients/new-vs-returning` | `/cancellations/reasons` |
| `/reviews/distribution` | `/waitlist/demand` |
| | `/clients/visit-cadence` |

**Tests:** `reviews/statistics/StatisticsApiTest` — 8 escenarios

---

## Pruebas positivas

### STAT-P01 — Indicadores basicos con cualquier plan

- **Precondiciones:** profesional con empresa en plan `none` y horario configurado.
- **Resultado esperado:** los siete endpoints libres responden 200 con `status: SUCCESS`.

### STAT-P02 — Indicadores avanzados con plan Pro

- **Precondiciones:** empresa en plan `pro` activo.
- **Resultado esperado:** los ocho endpoints reservados responden 200.

### STAT-P03 — Los conteos cuadran con las citas

- **Precondiciones:** tres citas pasadas: completada, no presentada y cancelada.
- **Resultado esperado:** los indicadores de no-show y de tasa de completacion responden 200
  con datos coherentes con esas citas.

## Pruebas negativas

### STAT-N01 — Periodo desconocido

- **Request:** `?period=PERIODO_INVENTADO`.
- **Resultado esperado:** la API responde sin exponer detalles internos. El comportamiento
  exacto (valor por defecto o rechazo) queda documentado por el propio test.

## Pruebas de seguridad

### STAT-S01 — Los avanzados exigen plan Pro

- **Precondiciones:** empresa sin plan.
- **Resultado esperado:** 403 en los ocho, con `"Esta funcion requiere el plan Pro. Actualiza
  tu suscripcion para acceder a estadisticas avanzadas."`.

### STAT-S02 — El limite se comprueba en cada peticion

- **Descripcion:** el plan no se cachea, asi que perderlo tiene efecto inmediato.
- **Request:** consultar ingresos con Pro, bajar el plan a `none` en la base y repetir.
- **Resultado esperado:** 200 y luego 403, sin necesidad de reiniciar ni de esperar a que
  caduque ninguna cache.

### STAT-S03 — Sin empresa no se ven datos de nadie

- **Precondiciones:** otra empresa con citas; el profesional que consulta no tiene empresa.
- **Resultado esperado:** la respuesta no contiene ningun dato de la empresa ajena.

### STAT-S04 — Autenticacion y rol

- **Resultado esperado:** 403 sin cabecera y 401 con un token invalido.
