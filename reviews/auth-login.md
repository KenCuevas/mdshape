# Epica: auth-login

Inicio de sesion del profesional. Es la puerta de entrada a todo lo demas y el unico endpoint
de autenticacion con limite de intentos.

**Endpoint:** `POST /api/auth/login` (publico, `@RateLimited(login, 5, 5m)`)
**Implementacion:** `AuthController.login` → `AuthService.login`
**Tests:** `reviews/auth/AuthLoginApiTest` — 12 escenarios

**Contrato de la peticion**

| Campo | Reglas |
| :--- | :--- |
| `email` | obligatorio, formato de correo |
| `password` | obligatorio |

Cabeceras leidas: `User-Agent`, `X-Device-Fingerprint` (16-128 caracteres hexadecimales; otro
valor se sustituye por SHA-256 de `ip|user-agent`).

**Efectos de un inicio de sesion correcto:** `users.last_login`, una fila nueva en
`session_tokens` (token de refresco, caducidad, IP, agente y huella) y una en `login_history`
con `LOGIN`/`SUCCESS`.

---

## Pruebas positivas

### LOGIN-P01 — Credenciales validas

- **Descripcion:** el caso normal. Comprueba el sobre completo de la respuesta, que el token
  de acceso sirve de verdad y los tres efectos en base de datos.
- **Precondiciones:** usuario verificado y activo con contrasena conocida.
- **Request:** `POST /api/auth/login` con `{"email": "...", "password": "..."}`.
- **Resultado esperado:** 200. `status: SUCCESS`, `code: 200`, `message: "Autenticacion
  exitosa"`, `data` con `accessToken`, `refreshToken`, `home`, `onboardingComplete`,
  `verified`, `active` y `subscription`. Una sesion activa, una fila de `login_history` y
  `last_login` actualizado. El `accessToken` autentica contra `GET /api/me`.

### LOGIN-P02 — Profesional con empresa configurada

- **Descripcion:** el bloque `home` cambia segun haya empresa o no.
- **Precondiciones:** usuario con una empresa en plan `pro` activo.
- **Request:** el mismo inicio de sesion.
- **Resultado esperado:** 200 con `home.companyName` igual al nombre de la empresa, sin
  `home.message`, y `subscription.planId: "pro"` con `status: "active"`. Sin empresa,
  `companyName` no viene y `message` invita a configurarla.

## Pruebas negativas

### LOGIN-N01 — Contrasena incorrecta

- **Descripcion:** comprueba que una contrasena incorrecta no crea sesion ni fila de historial;
  los intentos fallidos no se registran (ver `findings.md`).
- **Precondiciones:** usuario verificado y activo.
- **Request:** contrasena que no corresponde.
- **Resultado esperado:** 401 con `status: FAILURE` y `message: "Credenciales invalidas"`, sin
  `data`. **Ninguna** fila nueva en `session_tokens` ni en `login_history`: los intentos
  fallidos no se registran (ver observaciones de `findings.md`).

### LOGIN-N02 — Correo inexistente

- **Descripcion:** que no se pueda distinguir un correo registrado de uno que no lo esta.
- **Request:** correo que no existe.
- **Resultado esperado:** 401 con el mismo mensaje exacto que LOGIN-N01.

### LOGIN-N03 — Cuenta sin verificar o desactivada

- **Descripcion:** comprueba los mensajes de cuenta sin verificar y cuenta desactivada, que
  solo aparecen tras acertar la contrasena para no permitir enumerar cuentas.
- **Precondiciones:** un usuario sin verificar y otro verificado pero inactivo.
- **Request:** inicio de sesion con la contrasena correcta.
- **Resultado esperado:** 401 con `"La cuenta no ha sido verificada"` y `"La cuenta esta
  desactivada"` respectivamente. Sin sesiones creadas. Estos mensajes solo aparecen tras
  acertar la contrasena, asi que no permiten enumerar cuentas.

### LOGIN-N04 — Cuerpo invalido

- **Descripcion:** valida el formato del cuerpo de la peticion, con un `details` por campo y
  sin escribir nada en base de datos.
- **Request:** `{"email": "no-es-un-email", "password": ""}` y tambien `{}`.
- **Resultado esperado:** 400 con `message: "Solicitud invalida"` y `details` con una entrada
  por campo (`email`, `password`). Nada escrito en base de datos.

### LOGIN-N05 — El correo distingue mayusculas

- **Descripcion:** documenta el comportamiento actual, que puede sorprender: la busqueda es
  exacta.
- **Precondiciones:** usuario dado de alta como `Mixed.Case@Test.local`.
- **Resultado esperado:** con el correo tal cual, 200; en minusculas, 401.

## Pruebas de seguridad

### LOGIN-S01 — Limite de intentos por IP

- **Descripcion:** cinco intentos cada cinco minutos por IP; el sexto se rechaza aunque la
  contrasena sea correcta.
- **Precondiciones:** Redis disponible (lo aporta Testcontainers).
- **Request:** cinco inicios de sesion fallidos y uno correcto; despues, uno con
  `X-Forwarded-For: 203.0.113.7, 10.0.0.1`.
- **Resultado esperado:** 429 con `"Rate limit exceeded. Please try again later."` en el
  sexto. Desde otra IP, 200: el contador es por actor.

### LOGIN-S02 — Cabecera Bearer invalida en un endpoint publico

- **Descripcion:** el filtro JWT corre en todas las rutas, tambien en las publicas.
- **Request:** inicio de sesion valido con `Authorization: Bearer no.es.un.jwt`.
- **Resultado esperado:** 401 antes de llegar al controlador, con el formato propio del
  filtro (`error`, `message`, `path`), distinto del sobre `ApiResponse`.

### LOGIN-S03 — Normalizacion de la huella de dispositivo

- **Descripcion:** una huella hexadecimal valida se guarda en minusculas; una que no lo es se
  sustituye por un hash.
- **Request:** `X-Device-Fingerprint: ABCDEF0123456789` en un usuario y `zz-no-hex` en otro.
- **Resultado esperado:** en el primero se guarda en minusculas tal cual; en el segundo, un
  hash de 64 caracteres hexadecimales.

## Pruebas de error

### LOGIN-E01 — Metodo no permitido

- **Descripcion:** `GET` sobre un endpoint que solo acepta `POST`.
- **Resultado esperado:** deberia ser 405. Hoy es 500 por el catch-all (**BUG-05**). En
  cualquier caso el cuerpo no contiene trazas ni nombres de clase.

### LOGIN-E02 — Tipo de contenido no soportado

- **Descripcion:** un `Content-Type` no soportado deberia dar 415 y hoy da 500 (**BUG-05**),
  sin filtrar detalles internos.
- **Request:** `Content-Type: text/plain` con `email=a&password=b`.
- **Resultado esperado:** deberia ser 415, hoy es 500 (**BUG-05**), y de nuevo sin filtrar
  detalles internos.
