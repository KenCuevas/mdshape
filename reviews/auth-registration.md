# Epica: auth-registration

Alta de un profesional y verificacion de la cuenta con un codigo de un solo uso enviado por
correo. Aqui viven dos de los hallazgos criticos.

**Endpoints**

| Metodo | Ruta | Acceso |
| :--- | :--- | :--- |
| POST | `/api/auth/register` | publico, `@RateLimited(register, 3, 1h)` |
| POST | `/api/auth/verify-otp` | publico, **sin limite** |
| POST | `/api/auth/resend-otp` | publico, **sin limite** |

**Tests:** `reviews/auth/AuthRegistrationApiTest` — 17 escenarios

**Contrato del alta**

| Campo | Reglas |
| :--- | :--- |
| `firstName`, `lastName` | obligatorios |
| `email` | obligatorio, formato de correo, unico |
| `phoneNumber` | obligatorio, `^1(809|829|849)\d{7}$`, unico |
| `password` | obligatorio, minimo 8 caracteres |
| `termsAccepted`, `privacyAccepted` | booleanos, **sin validacion de que sean ciertos** |

**Codigo de verificacion:** seis digitos, quince minutos de vigencia, cinco intentos como
maximo (ver SEC-02: ese limite no funciona), guardado en claro en `email_otps`.

---

## Pruebas positivas

### REG-P01 — Alta valida

- **Descripcion:** el alta crea la cuenta sin verificar, le asigna el rol OWNER, genera el
  codigo y dispara el correo de validacion.
- **Precondiciones:** correo y telefono no usados.
- **Request:** `POST /api/auth/register` con los seis campos.
- **Resultado esperado:** 201, `message: "Registro exitoso"`, `data` con ambos tokens,
  `onboardingPending: true` y `verificationPending: true`. En base de datos:
  `is_verified = false`, `is_active = false`, `consent_version = '1.0'`, una fila en
  `user_roles` con OWNER y un `email_otps` de seis digitos con `attempts = 0` y
  `max_attempts = 5`. El correo de validacion se envia con **ese mismo codigo**.

### OTP-P01 — Codigo correcto

- **Precondiciones:** cuenta sin verificar con un codigo vigente.
- **Request:** `POST /api/auth/verify-otp` con el correo y el codigo.
- **Resultado esperado:** 200 con `message: "Cuenta verificada correctamente"` y tokens
  utilizables. La cuenta pasa a activa y verificada, y **todos** los codigos del usuario se
  borran. El token de acceso devuelto autentica contra `GET /api/me`.

### RESEND-P01 / OTP-N05 — Reenvio con un codigo vigente

- **Descripcion:** reenviar no genera un codigo nuevo mientras el anterior siga vivo.
- **Resultado esperado:** 200, una sola fila en `email_otps`, y el correo sale con el mismo
  codigo de antes.

## Pruebas negativas

### REG-N01 — Correo o telefono repetidos

- **Precondiciones:** una cuenta ya dada de alta.
- **Resultado esperado:** 400 con `"El email ya esta registrado"` o `"El telefono ya esta
  registrado"`. Sigue habiendo un solo usuario.

### REG-N02 — Validaciones de formato

- **Request:** telefono de diez digitos, y despues un cuerpo con todos los campos vacios o
  invalidos.
- **Resultado esperado:** 400 con `details[0].field = "phoneNumber"` y el mensaje `"Número de
  teléfono dominicano inválido"`; en el segundo caso, una entrada por cada campo. Ningun
  usuario creado.

### OTP-N03 — Codigo expirado

- **Precondiciones:** codigo con `expires_at` en el pasado.
- **Resultado esperado:** 400 `"Codigo invalido o expirado"` aunque el codigo sea el correcto.

### OTP-N04 — Correo desconocido o cuerpo invalido

- **Resultado esperado:** 400 con el mismo mensaje generico para un correo que no existe (no
  revela nada) y 400 con `details` por campo cuando el cuerpo no cumple.

### RESEND-N01 — Reenvio a una cuenta ya verificada

- **Resultado esperado:** 409 `"La cuenta ya esta verificada"`. Con un correo desconocido, en
  cambio, responde 400 `"No se encontro el usuario"`: esa diferencia permite enumerar cuentas
  (**SEC-05**).

## Pruebas de seguridad

### REG-S01 — Los tokens del alta no sirven hasta verificar

- **Descripcion:** el alta devuelve tokens, pero la cuenta esta inactiva.
- **Resultado esperado:** `GET /api/me` con ese token responde 403 y el refresco responde 401
  `"La cuenta no ha sido verificada"`.

### REG-S02 — Limite de altas por IP

- **Resultado esperado:** las tres primeras altas de una hora responden 201 y la cuarta 429.
  Solo quedan tres usuarios.

### OTP-S01 — (HALLAZGO SEC-01, critico) Tokens sin comprobar el codigo

- **Descripcion:** con la cuenta ya verificada, `verify-otp` emite tokens sin mirar el codigo.
- **Precondiciones:** un usuario verificado; el atacante solo conoce su correo.
- **Request:** `{"email": "victima@...", "code": "000000"}` sin autenticacion.
- **Resultado esperado (hoy):** 200 con tokens validos, y `GET /api/me` con ellos devuelve los
  datos de la victima.
- **Resultado correcto:** 409 sin tokens.

### OTP-N01 y OTP-N02 — (HALLAZGO SEC-02, critico) El limite de intentos no existe

- **Descripcion:** el incremento de `attempts` se deshace con el rollback de la excepcion.
- **Request:** veinte codigos incorrectos seguidos y despues el correcto.
- **Resultado esperado (hoy):** `attempts` sigue en 0 y el codigo correcto verifica la cuenta
  sin problema. Sin limite de intentos ni rate limiting, un codigo de seis digitos es
  adivinable.
- **Resultado correcto:** `attempts` incrementandose y bloqueo al quinto fallo.

### REG-N03 — (HALLAZGO SEC-03) Consentimiento registrado sin aceptacion

- **Request:** alta con `termsAccepted: false` y `privacyAccepted: false`.
- **Resultado esperado (hoy):** 201; la fila queda con `terms_accepted = false` y a la vez
  `consent_at` con fecha.
- **Resultado correcto:** 400, o `consent_at` nulo.

## Pruebas de error

### REG-P02 — Correo largo (antes REG-E01, hallazgo BUG-01 corregido)

- **Request:** alta con un correo de 57 caracteres.
- **Resultado esperado:** 201 y una fila en `session_tokens`. Con la columna en `VARCHAR(255)`
  el token de refresco no cabia y el alta respondia 500; la migracion `V70` la pasa a `TEXT`.

### OTP-P02 — Verificar justo despues del alta (antes OTP-E01, hallazgo BUG-03 corregido)

- **Request:** alta e, inmediatamente, verificacion con el codigo correcto.
- **Resultado esperado:** 200, cuenta verificada y dos filas en `session_tokens` con refresh
  tokens distintos. Sin `jti` los dos pares de tokens del mismo segundo eran identicos y
  chocaban con la unicidad de `refresh_token`.
