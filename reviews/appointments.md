# Epica: appointments

Agenda interna del profesional: crear citas, cambiar su estado, consultarlas por dia o por
mes, el historial y los huecos libres.

**Endpoints** (todos bajo `@PreAuthorize("hasRole('OWNER')")`)

| Metodo | Ruta |
| :--- | :--- |
| POST | `/api/appointments` |
| GET | `/api/appointments` (hoy), `/{date}`, `/monthly-summary`, `/history`, `/availability` |
| GET | `/api/appointments/{id}/detail` |
| PUT | `/api/appointments/{id}` |
| PATCH | `/api/appointments/{id}/status` |
| GET | `/api/appointments/pending-approval`, `/groups/{id}` |
| PATCH | `/api/appointments/groups/{id}/approve` |

**Tests:** `reviews/appointment/AppointmentApiTest` — 18 escenarios

**Precondiciones comunes:** profesional verificado con empresa, horario semanal de 09:00 a
18:00 y al menos un servicio activo. Las horas se interpretan en `America/Santo_Domingo`.

**Reglas clave**

- La duracion y el precio salen de los servicios elegidos, no del cuerpo.
- La cita debe caber dentro del horario del dia y fuera de las pausas.
- No puede solaparse con otra activa: lo garantiza una restriccion de exclusion GiST de
  PostgreSQL, no el codigo.
- Estados: `SCHEDULED`, `PENDING_APPROVAL`, `COMPLETED`, `CANCELLED`, `NO_SHOW`. No se puede
  completar antes de que la cita termine ni marcar no-show antes de que empiece; desde
  `CANCELLED`, `COMPLETED` o `NO_SHOW` no se sale.

---

## Pruebas positivas

### APPT-P01 — Crear una cita

- **Request:** `POST /api/appointments` con cliente, fecha y hora de inicio y la lista de
  servicios.
- **Resultado esperado:** 201 `"Cita agendada"`. Se crea el cliente si no existia, la cita
  queda en `SCHEDULED`, se guardan sus servicios y la duracion y el importe se calculan a
  partir de ellos (60 minutos y 50000 en el caso probado).

### APPT-P02 — Cambios de estado

- **Precondiciones:** dos citas ya pasadas en `SCHEDULED`.
- **Request:** `PATCH /{id}/status` con `COMPLETED` y con `NO_SHOW`.
- **Resultado esperado:** 200 en ambos, el estado persistido y una entrada por cada cambio en
  la bitacora `appointment_events`.

### APPT-P03 — Agenda del dia y resumen mensual

- **Resultado esperado:** 200 con la cita del dia consultado y el resumen del mes; solo
  aparecen las citas de la propia empresa.

### APPT-P04 — Historial paginado

- **Precondiciones:** tres citas en dias distintos.
- **Request:** `/history?startDate&endDate&page=0&size=2`.
- **Resultado esperado:** 200 con exactamente dos entradas.

### APPT-P05 — Disponibilidad del dia

- **Request:** `/availability?date=...`.
- **Resultado esperado:** 200 con los huecos del dia; el que ya tiene cita no figura como
  libre.

### APPT-P06 — Pausas del horario

- **Precondiciones:** pausa de 13:00 a 14:00 en el dia elegido.
- **Resultado esperado:** una cita a las 13:00 se rechaza con 400 `"La cita no puede agendarse
  en una pausa"`.

## Pruebas negativas

### APPT-N01 — Solapamiento

- **Resultado esperado:** la segunda cita en el mismo hueco responde 409 y sigue habiendo una
  sola cita.

### APPT-N02 — Fuera del horario laboral

- **Request:** cita a las 04:00.
- **Resultado esperado:** 400 `"La cita debe estar dentro del horario laboral"`, sin crear
  nada.

### APPT-N03 — Servicio de otra empresa

- **Resultado esperado:** 400 y ninguna cita creada: los servicios se validan contra la
  empresa del profesional.

### APPT-N04 — Cuerpo invalido

- **Request:** nombre vacio, correo mal formado y lista de servicios vacia.
- **Resultado esperado:** 400 con `details` para `clientName`, `clientEmail` y `categoryIds`.

### APPT-N05 — Transiciones invalidas

- **Resultado esperado:** 400 con el mensaje correspondiente en cada caso: completar una
  cancelada, completar una ya completada, completar una cita futura, marcar no-show antes de
  que empiece y repetir el estado actual.

### APPT-N06 — Mes fuera de rango

- **Request:** `/monthly-summary?year=2026&month=13`.
- **Resultado esperado:** 400 `"El anio o mes son invalidos"`.

### APPT-N07 — Parametros del historial

- **Resultado esperado:** `page` negativo da 400 `"El parametro page no puede ser negativo"` y
  un rango invertido tambien 400. Sin fechas responde 500 en vez de 400 (**BUG-05**).

### APPT-N08 — Disponibilidad sin fechas

- **Resultado esperado:** 400 `"Indica date, o startDate y endDate"`.

## Pruebas de seguridad

### APPT-S01 — Aislamiento entre empresas

- **Precondiciones:** una cita de otra empresa.
- **Resultado esperado:** cambiar su estado da 403 `"No puedes modificar citas de otra
  empresa"`, su detalle da error de cliente, y la cita queda intacta.

### APPT-S02 — La agenda exige autenticacion

- **Resultado esperado:** sin cabecera, 403; con un token invalido, 401. Ninguna cita se
  filtra.

## Pruebas de error

### APPT-E01 — Empresa sin horario configurado

- **Resultado esperado:** error de cliente controlado, sin trazas ni nombres de clase en la
  respuesta.

### APPT-E02 — (HALLAZGO BUG-05) Estado inexistente

- **Request:** `PATCH /{id}/status` con `{"status": "INVENTADO"}`.
- **Resultado esperado (hoy):** 500, sin filtrar detalles, y la cita sin tocar.
- **Resultado correcto:** 400 indicando el campo invalido.
