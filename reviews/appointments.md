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

- **Descripcion:** creacion basica de una cita; comprueba que el cliente se crea si no existia
  y que la duracion y el importe salen de los servicios elegidos.
- **Request:** `POST /api/appointments` con cliente, fecha y hora de inicio y la lista de
  servicios.
- **Resultado esperado:** 201 `"Cita agendada"`. Se crea el cliente si no existia, la cita
  queda en `SCHEDULED`, se guardan sus servicios y la duracion y el importe se calculan a
  partir de ellos (60 minutos y 50000 en el caso probado).

### APPT-P02 — Cambios de estado

- **Descripcion:** las transiciones validas a `COMPLETED` y `NO_SHOW` persisten el estado y
  quedan registradas en `appointment_events`.
- **Precondiciones:** dos citas ya pasadas en `SCHEDULED`.
- **Request:** `PATCH /{id}/status` con `COMPLETED` y con `NO_SHOW`.
- **Resultado esperado:** 200 en ambos, el estado persistido y una entrada por cada cambio en
  la bitacora `appointment_events`.

### APPT-P03 — Agenda del dia y resumen mensual

- **Descripcion:** la agenda del dia y el resumen mensual solo muestran las citas de la propia
  empresa.
- **Resultado esperado:** 200 con la cita del dia consultado y el resumen del mes; solo
  aparecen las citas de la propia empresa.

### APPT-P04 — Historial paginado

- **Descripcion:** la paginacion del historial (`page=0&size=2`) devuelve exactamente el numero
  de entradas pedido.
- **Precondiciones:** tres citas en dias distintos.
- **Request:** `/history?startDate&endDate&page=0&size=2`.
- **Resultado esperado:** 200 con exactamente dos entradas.

### APPT-P05 — Disponibilidad del dia

- **Descripcion:** el hueco que ya tiene una cita asignada no aparece entre los huecos libres
  del dia.
- **Request:** `/availability?date=...`.
- **Resultado esperado:** 200 con los huecos del dia; el que ya tiene cita no figura como
  libre.

### APPT-P06 — Pausas del horario

- **Descripcion:** una cita que cae dentro de una pausa del horario se rechaza aunque el resto
  del dia este libre.
- **Precondiciones:** pausa de 13:00 a 14:00 en el dia elegido.
- **Resultado esperado:** una cita a las 13:00 se rechaza con 400 `"La cita no puede agendarse
  en una pausa"`.

## Pruebas negativas

### APPT-N01 — Solapamiento

- **Descripcion:** dos citas no pueden ocupar el mismo hueco; la segunda responde 409 y no se
  crea.
- **Resultado esperado:** la segunda cita en el mismo hueco responde 409 y sigue habiendo una
  sola cita.

### APPT-N02 — Fuera del horario laboral

- **Descripcion:** una cita fuera del horario laboral del dia (04:00) se rechaza sin crear
  nada.
- **Request:** cita a las 04:00.
- **Resultado esperado:** 400 `"La cita debe estar dentro del horario laboral"`, sin crear
  nada.

### APPT-N03 — Servicio de otra empresa

- **Descripcion:** no se puede crear una cita con un servicio que pertenece a otra empresa.
- **Resultado esperado:** 400 y ninguna cita creada: los servicios se validan contra la
  empresa del profesional.

### APPT-N04 — Cuerpo invalido

- **Descripcion:** valida los tres campos obligatorios del cuerpo de creacion: `clientName`,
  `clientEmail` y `categoryIds`.
- **Request:** nombre vacio, correo mal formado y lista de servicios vacia.
- **Resultado esperado:** 400 con `details` para `clientName`, `clientEmail` y `categoryIds`.

### APPT-N05 — Transiciones invalidas

- **Descripcion:** barre cinco transiciones de estado no permitidas, cada una con su propio
  mensaje de error.
- **Resultado esperado:** 400 con el mensaje correspondiente en cada caso: completar una
  cancelada, completar una ya completada, completar una cita futura, marcar no-show antes de
  que empiece y repetir el estado actual.

### APPT-N06 — Mes fuera de rango

- **Descripcion:** un mes fuera del rango 1-12 en el resumen mensual se rechaza con 400.
- **Request:** `/monthly-summary?year=2026&month=13`.
- **Resultado esperado:** 400 `"El anio o mes son invalidos"`.

### APPT-N07 — Parametros del historial

- **Descripcion:** valida los parametros del historial (`page` negativo, rango de fechas
  invertido) y deja constancia de que sin fechas responde 500 en vez de 400 (**BUG-05**).
- **Resultado esperado:** `page` negativo da 400 `"El parametro page no puede ser negativo"` y
  un rango invertido tambien 400. Sin fechas responde 500 en vez de 400 (**BUG-05**).

### APPT-N08 — Disponibilidad sin fechas

- **Descripcion:** consultar disponibilidad sin `date` ni el par `startDate`/`endDate` responde
  400.
- **Resultado esperado:** 400 `"Indica date, o startDate y endDate"`.

## Pruebas de seguridad

### APPT-S01 — Aislamiento entre empresas

- **Descripcion:** un profesional no puede modificar ni consultar el detalle de una cita de
  otra empresa.
- **Precondiciones:** una cita de otra empresa.
- **Resultado esperado:** cambiar su estado da 403 `"No puedes modificar citas de otra
  empresa"`, su detalle da error de cliente, y la cita queda intacta.

### APPT-S02 — La agenda exige autenticacion

- **Descripcion:** la agenda no responde sin autenticacion valida, ni con cabecera ausente ni
  con token invalido.
- **Resultado esperado:** sin cabecera, 403; con un token invalido, 401. Ninguna cita se
  filtra.

## Pruebas de error

### APPT-E01 — Empresa sin horario configurado

- **Descripcion:** consultar la agenda de una empresa sin horario configurado da un error
  controlado, sin trazas ni nombres de clase.
- **Resultado esperado:** error de cliente controlado, sin trazas ni nombres de clase en la
  respuesta.

### APPT-E02 — (HALLAZGO BUG-05) Estado inexistente

- **Descripcion:** documenta el hallazgo **BUG-05**: un estado inexistente deberia dar 400 y
  hoy da 500.
- **Request:** `PATCH /{id}/status` con `{"status": "INVENTADO"}`.
- **Resultado esperado (hoy):** 500, sin filtrar detalles, y la cita sin tocar.
- **Resultado correcto:** 400 indicando el campo invalido.
