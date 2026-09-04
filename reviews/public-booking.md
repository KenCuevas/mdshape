# Epica: public-booking

El cliente final reserva desde el enlace publico del profesional, sin cuenta en la plataforma.
Es la superficie mas expuesta de la API: sin autenticacion, con captcha, limite de peticiones,
idempotencia y una sesion firmada atada al navegador.

**Endpoints** (todos publicos, bajo `/api/public/book`)

| Metodo | Ruta | Notas |
| :--- | :--- | :--- |
| POST | `/{slug}/session` | abre la sesion publica |
| GET | `/{slug}`, `/{slug}/reviews`, `/{slug}/availability` | requieren el token de sesion |
| POST | `/{slug}/appointments` | `@RateLimited(20/1m)` + captcha + `Idempotency-Key` |
| POST | `/{slug}/group-appointments` | idem; requiere plan Pro |
| GET | `/{slug}/appointments/{token}` | gestion por token de la cita |
| POST | `/{slug}/appointments/{token}/cancel`, `/reschedule`, `/deposit-receipt` | |
| GET/POST | `/{slug}/bookings/{groupToken}...` | equivalentes para grupos |

**Tests:** `reviews/publicbooking/PublicBookingApiTest` — 21 escenarios

**Precondiciones comunes:** empresa con ubicacion, horario semanal, al menos un servicio
activo, ajustes de reserva publica (slot 60 min, 60 min de antelacion, 30 dias de ventana) y
un enlace compartido activo.

**Sesion publica:** JWT firmado con `slug`, id de empresa y una huella (SHA-256 de IP y
`User-Agent`), valido 30 minutos, que viaja en `X-Public-Booking-Token`.

---

## Pruebas positivas

### PUB-P01 — Apertura de sesion y perfil

- **Descripcion:** comprueba el flujo basico de entrada al enlace publico: abrir sesion y
  despues leer el perfil del negocio con ese token.
- **Request:** `POST /{slug}/session` y despues `GET /{slug}` con el token.
- **Resultado esperado:** 201 con token y caducidad; el perfil devuelve el nombre del negocio
  y sus servicios activos.

### PUB-P02 — Reserva valida

- **Descripcion:** el caso normal de reserva publica. Comprueba que se crea el cliente y la
  cita, que queda registrada la aceptacion de terminos y que el `actionToken` sirve para
  consultarla despues.
- **Request:** `POST /{slug}/appointments` con fecha, hora de inicio y fin, servicios, nombre,
  contacto, `allowWhatsApp` y `acceptedTermsAndPrivacy`.
- **Resultado esperado:** 201 `"Cita agendada"` con `publicId`, `actionToken` y estado
  `SCHEDULED`. Se crea el cliente y la cita, y `terms_accepted_at` queda con fecha. El
  `actionToken` permite consultar la cita.

### PUB-P03 — Idempotencia

- **Descripcion:** repetir la misma reserva con la misma `Idempotency-Key` no debe crear una
  segunda cita.
- **Request:** la misma reserva dos veces con la misma `Idempotency-Key`.
- **Resultado esperado:** 201 las dos veces, **una sola** cita y una sola clave registrada.

### PUB-P04 — Gestion por token

- **Descripcion:** el cliente sin cuenta puede cancelar su propia cita usando solo el
  `actionToken`, sin necesidad de autenticarse.
- **Request:** `POST /{slug}/appointments/{actionToken}/cancel`.
- **Resultado esperado:** 200 y la cita en `CANCELLED`, sin que el cliente tenga cuenta.

## Pruebas negativas

### PUB-N01 — Slug desconocido o mal formado

- **Descripcion:** distingue un slug que no existe (o esta inactivo) de uno con formato
  invalido.
- **Resultado esperado:** 404 `"Enlace no encontrado o inactivo"` y 400 `"Slug invalido"`
  respectivamente.

### PUB-N02 — Enlace desactivado

- **Descripcion:** un enlace desactivado se trata igual que uno inexistente, aunque la empresa
  siga activa.
- **Resultado esperado:** 404 aunque la empresa exista y este operativa.

### PUB-N03 — Duracion que no cuadra

- **Descripcion:** la hora de fin declarada debe coincidir con la suma de duraciones de los
  servicios elegidos.
- **Request:** una hora de fin que no coincide con la suma de los servicios.
- **Resultado esperado:** 400 `"La duracion seleccionada no coincide con la suma de
  categorias"`, sin crear la cita.

### PUB-N04 — Ventana de reserva

- **Descripcion:** cubre los dos limites de la ventana de reserva publica: la antelacion minima
  y la ventana maxima de 30 dias.
- **Request:** una fecha pasada y otra a 120 dias vista.
- **Resultado esperado:** 400 en ambos casos (antelacion minima y ventana maxima), sin citas
  creadas.

### PUB-N05 — Sin canal de contacto

- **Descripcion:** si no hay correo y `allowWhatsApp` es falso, no queda ningun canal para
  contactar al cliente.
- **Request:** sin correo y con `allowWhatsApp: false`.
- **Resultado esperado:** 400 pidiendo al menos un canal valido.

### PUB-N06 — Terminos y condiciones

- **Descripcion:** distingue rechazar explicitamente los terminos de simplemente no enviar el
  campo, que solo se tolera en la web de agendamiento antigua mientras
  `public-booking.require-terms-acceptance` este apagada.
- **Request:** `acceptedTermsAndPrivacy: false` y, aparte, el campo ausente.
- **Resultado esperado:** el `false` explicito se rechaza siempre con 400. El campo ausente se
  tolera mientras `public-booking.require-terms-acceptance` este apagada —es la web de
  agendamiento antigua— y la cita se crea con `terms_accepted_at` nulo.

### PUB-N07 — Hueco ya ocupado

- **Descripcion:** dos reservas para el mismo hueco no pueden coexistir; la segunda falla y
  solo queda una cita.
- **Resultado esperado:** error de cliente en la segunda reserva y una sola cita.

### PUB-N08 — Cuerpo vacio

- **Descripcion:** valida que se reportan los campos obligatorios que faltan cuando el cuerpo
  llega vacio.
- **Resultado esperado:** 400 con `details` para `date`, `startTime`, `endTime`,
  `categoryIds`, `customerName` y `allowWhatsApp`.

## Pruebas de seguridad

### PUB-S01 — La sesion esta atada al navegador y al enlace

- **Descripcion:** el token de sesion deja de servir si cambia el `User-Agent` o si se usa
  sobre un slug distinto de aquel para el que se emitio.
- **Request:** el mismo token con otro `User-Agent`, y despues sobre otro slug.
- **Resultado esperado:** 401 en ambos casos.

### PUB-S02 — Tokens invalidos

- **Descripcion:** cubre tres formas de token invalido: ausente, manipulado, o un JWT de un
  usuario de la plataforma en vez de una sesion publica.
- **Request:** sin token, con el token manipulado y con un JWT de usuario de la plataforma.
- **Resultado esperado:** 401 en los tres casos.

### PUB-S03 — Cliente vetado

- **Descripcion:** un cliente en la lista de vetados de la empresa no puede reservar, y el
  mensaje de error es neutro para no revelar el veto.
- **Precondiciones:** el correo y el telefono del cliente estan en la lista de vetados de la
  empresa.
- **Resultado esperado:** 422 con `"No hay disponibilidad para agendar en este momento"`, un
  mensaje neutro que no revela el veto, y ninguna cita creada.

### PUB-S04 — Token de gestion verificado

- **Descripcion:** el token de gestion de una cita se valida igual que el de sesion: inventado
  o alterado, ambos fallan sin afectar a la cita.
- **Request:** cancelar con un token inventado y con uno alterado.
- **Resultado esperado:** error de cliente en ambos y la cita sigue en `SCHEDULED`.

### PUB-S05 — Ventana horaria del enlace cerrada

- **Descripcion:** si el enlace tiene su ventana horaria configurada en otro dia de la semana,
  ni siquiera se puede abrir la sesion publica.
- **Precondiciones:** una ventana configurada en otro dia de la semana.
- **Resultado esperado:** ni siquiera se puede abrir la sesion publica.

### PUB-S06 — Limite de peticiones

- **Descripcion:** comprueba que el `@RateLimited(20/1m)` se aplica de verdad: las primeras
  veinte peticiones pasan (y fallan por invalidas) y la vigesimoprimera se corta con 429.
- **Request:** veinte reservas invalidas seguidas y una mas.
- **Resultado esperado:** las veinte devuelven 400 y la 21 devuelve 429.

## Pruebas de error

### PUB-E01 — Empresa sin servicios activos

- **Descripcion:** cuando la empresa no tiene servicios activos, el error incluye los datos de
  contacto del profesional para que el cliente sepa a quien escribir.
- **Resultado esperado:** 409 con `error_code: "AGEND-0001"` y `metadata.company` con los
  datos de contacto del profesional, para que el cliente sepa a quien escribir.

### PUB-E02 — Empresa sin horarios activos

- **Descripcion:** mismo tipo de bloqueo que `PUB-E01` pero por falta de horarios activos, con
  su propio `error_code`.
- **Resultado esperado:** 409 con `error_code: "AGEND-0002"`.

### PUB-E03 — Los errores publicos no filtran nada

- **Descripcion:** ninguna respuesta de error de esta superficie publica debe exponer trazas,
  SQL ni nombres de excepcion internos.
- **Resultado esperado:** ninguna respuesta de error contiene trazas, SQL ni nombres de
  excepcion.
