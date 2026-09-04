# Epica: security

Comportamientos transversales de seguridad: quien entra, con que, que ve y que cabeceras
salen. Complementa las comprobaciones de seguridad que ya tiene cada epica.

**Que se cubre**

- Las tres cadenas de `SecurityConfig`: actuator, `/api/admin/**` con `hasRole('ADMIN')` y la
  general con sus rutas publicas.
- El filtro JWT: firma, tipo de token, sesion viva, estado de la cuenta.
- Aislamiento entre empresas.
- Cabeceras de seguridad, CORS e identificador de peticion.

**Tests:** `reviews/security/SecurityApiTest` — 12 escenarios

---

## Pruebas positivas

### SEC-P01 — Rutas publicas y protegidas

- **Descripcion:** comprueba que las rutas publicas responden sin token y que las protegidas
  devuelven 403 (no 401) porque no hay `AuthenticationEntryPoint` configurado.
- **Request:** login y una pagina legal sin token; despues, diez endpoints protegidos sin
  cabecera.
- **Resultado esperado:** los publicos responden segun su logica; los diez protegidos
  responden 403. Es 403 y no 401 porque no hay `AuthenticationEntryPoint` configurado: el 401
  solo aparece cuando **si** hay cabecera y se rechaza.

### SEC-P02 — Cabeceras de seguridad

- **Descripcion:** verifica las cabeceras de seguridad estandar en toda respuesta, y que
  `Strict-Transport-Security` solo aparece sobre HTTPS.
- **Request:** peticion sobre HTTPS y sobre HTTP.
- **Resultado esperado:** `X-Frame-Options: DENY`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `Content-Security-Policy`, `X-Content-Type-Options:
  nosniff` y, solo sobre HTTPS, `Strict-Transport-Security: max-age=31536000 ;
  includeSubDomains`.

### SEC-P03 — Identificador de peticion

- **Descripcion:** cada peticion debe llevar un `X-Request-Id` unico que tambien viaja en el
  cuerpo como `request_id`, para poder cruzar un fallo del cliente con los logs del servidor.
- **Resultado esperado:** cada respuesta lleva `X-Request-Id`, el mismo valor viaja en
  `request_id` dentro del cuerpo, y dos peticiones nunca comparten identificador. Es lo que
  permite cruzar un fallo del cliente con los logs del servidor.

### SEC-P04 — CORS

- **Descripcion:** comprueba que el preflight `OPTIONS` desde el origen de la app responde con
  `Access-Control-Allow-Origin`.
- **Request:** preflight `OPTIONS` con `Origin: https://app.agendally.com`.
- **Resultado esperado:** 200 con `Access-Control-Allow-Origin`.

## Pruebas negativas

### SEC-N01 — Tokens invalidos

- **Descripcion:** cubre cuatro formas de token invalido (malformado, firma equivocada, tipo
  refresco y sesion revocada) y que cada una devuelve el motivo correspondiente.
- **Request:** token malformado, firmado con otra clave, de tipo refresco, y de una sesion
  revocada.
- **Resultado esperado:** 401 en los cuatro, con el motivo correspondiente (`"Token JWT
  malformado"`, `"Firma del token JWT inválida"`, y `"Sesion revocada o no encontrada"`).

### SEC-N02 — Cuentas desactivadas o sin verificar

- **Descripcion:** el filtro no puebla el contexto de seguridad para cuentas desactivadas o sin
  verificar, asi que la peticion sigue como anonima y termina en 403.
- **Resultado esperado:** 403. El filtro no puebla el contexto de seguridad para esas cuentas,
  asi que la peticion continua como anonima.

## Pruebas de seguridad

### SEC-S01 — El panel de administracion exige rol ADMIN

- **Descripcion:** un token de profesional no basta para el panel de administracion; solo un
  token de administrador pasa.
- **Request:** diez endpoints del panel con un token de profesional y sin token.
- **Resultado esperado:** 403 en todos. Con un token de administrador, 200.

### SEC-S03 — Aislamiento entre empresas

- **Descripcion:** cada profesional solo ve los clientes y la empresa propios, nunca los de
  otro profesional.
- **Precondiciones:** dos profesionales con su empresa y su cliente.
- **Resultado esperado:** el listado de clientes de uno trae solo el suyo, y la empresa que
  devuelve `/api/company` es la propia.

### SEC-S04 — Los errores de autenticacion no revelan nada

- **Descripcion:** que no se pueda distinguir un login fallido de un usuario existente de uno
  de un usuario inexistente.
- **Request:** login fallido de un usuario existente y de uno inexistente.
- **Resultado esperado:** el mismo mensaje exacto en ambos, sin trazas ni referencias al hash
  de la contrasena.

### SEC-S05 — El actuator no se sirve por el puerto de la API

- **Descripcion:** el actuator vive en su propio puerto, aislado por red, y no responde sobre
  el contexto de la API, aunque el perfil por defecto siga exponiendo mas de lo debido (ver
  `findings.md`).
- **Request:** `/manage/env` y `/manage/prometheus` sobre el contexto de la API.
- **Resultado esperado:** error de cliente. El actuator vive en su propio puerto, aislado por
  red. (En el perfil por defecto sigue exponiendo `env`, `loggers` y los volcados: ver las
  observaciones de `findings.md`.)

### SEC-S06 — Los datos sensibles no salen en las respuestas

- **Descripcion:** el perfil de usuario no debe filtrar el hash de la contrasena, ni en claro
  ni por el nombre del campo.
- **Resultado esperado:** el perfil no contiene el hash de la contrasena ni en claro ni con su
  nombre de campo.

### SEC-S02 — (HALLAZGO BUG-02) La denegacion por rol llega como 500

- **Descripcion:** documenta el hallazgo BUG-02: la denegacion por rol funciona de verdad, pero
  se filtra al cliente como 500 con traza en el log en vez del 403 esperado.
- **Request:** un administrador intenta usar cuatro endpoints de profesional.
- **Resultado esperado (hoy):** el acceso se deniega —que es lo importante— pero el cliente
  recibe 500 en vez de 403, y en los logs queda un error con traza por cada intento.
- **Resultado correcto:** 403 con el sobre habitual.
