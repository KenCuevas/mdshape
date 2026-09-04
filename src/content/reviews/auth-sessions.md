# Epica: auth-sessions

Ciclo de vida de la sesion: renovacion del token, cierre en un dispositivo o en todos, listado
de sesiones activas y revocacion.

**Endpoints**

| Metodo | Ruta | Acceso |
| :--- | :--- | :--- |
| POST | `/api/auth/refresh-token` | publico |
| POST | `/api/auth/logout` | publico (**ver SEC-04**) |
| POST | `/api/auth/logout-all` | `@PreAuthorize("isAuthenticated()")` |
| GET | `/api/auth/sessions` | `@PreAuthorize("isAuthenticated()")`, cacheado 30 min |
| DELETE | `/api/auth/sessions/{id}` | `@PreAuthorize("isAuthenticated()")` |

**Tests:** `reviews/auth/AuthSessionApiTest` — 10 escenarios

**Modelo:** una fila de `session_tokens` por sesion. El token de acceso lleva su id en el
claim `sid` y el filtro comprueba en **cada peticion** que la fila existe, no esta revocada y
no ha caducado. La renovacion no crea una fila nueva: reescribe la misma.

---

## Pruebas positivas

### REFRESH-P01 — Renovacion sobre la misma sesion

- **Precondiciones:** sesion abierta por la API.
- **Request:** `POST /api/auth/refresh-token` con `{"refreshToken": "..."}`.
- **Resultado esperado:** 200 con `message: "Token renovado"` y ambos tokens. El id de sesion
  del nuevo token de acceso es el mismo de antes, sigue habiendo una sola fila, y se registra
  un `REFRESH` en `login_history`. El token viejo deja de valer.
- **Nota:** el refresh token lleva un `jti` aleatorio, asi que el renovado es siempre distinto
  del anterior aunque caigan en el mismo segundo (antes no era asi, ver **BUG-03**).

### LOGOUT-P01 — Cierre de sesion

- **Precondiciones:** sesion abierta y un token push activo.
- **Resultado esperado:** 200 `"Sesion cerrada correctamente"`. La sesion queda revocada, los
  tokens push del usuario quedan inactivos y el token de acceso pasa a responder 401
  `"Sesion revocada o no encontrada"`.

### LOGOUT-ALL-P01 — Cierre en todos los dispositivos

- **Precondiciones:** dos sesiones del mismo usuario.
- **Resultado esperado:** 200 y **ninguna** sesion activa, incluida la que hizo la peticion.

### SESSIONS-P01 — Listado de sesiones

- **Precondiciones:** una sesion propia y una de otro usuario.
- **Resultado esperado:** 200 con una sola entrada, con `ip`, `revoked: false` y `location:
  "Desconocido"` (ese campo nunca se rellena). Las de otros usuarios no aparecen.

### SESSIONS-P02 — Revocacion de una sesion propia

- **Resultado esperado:** 200 `"Sesion revocada"` y el token correspondiente deja de valer al
  instante. Con el id de una sesion de otro usuario, 404 `"Sesion no encontrada"` y esa sesion
  intacta.

## Pruebas negativas

### REFRESH-N01 — Token desconocido, revocado o caducado

- **Resultado esperado:** 401 en los tres casos, con `"Refresh token no encontrado"`,
  `"Refresh token revocado"` y `"Refresh token expirado"` respectivamente.

### REFRESH-N02 — Token de acceso en lugar del de refresco

- **Resultado esperado:** 401. Con el campo vacio, 400 y `details[0].field =
  "refreshToken"`.

## Pruebas de seguridad

### LOGOUT-S01 — (HALLAZGO SEC-04) El cierre de sesion no comprueba propiedad

- **Descripcion:** el endpoint es publico y busca la fila por el valor del token, sin
  verificar la firma ni quien llama.
- **Request:** `POST /api/auth/logout` sin autenticacion, con el token de refresco de otro.
- **Resultado esperado (hoy):** 200 y la sesion de la victima revocada. Con un token
  inventado tambien responde 200 (idempotente, sin filtrar si existia).
- **Resultado correcto:** exigir autenticacion y que la sesion sea del usuario que llama.

### SESSIONS-S01 — (HALLAZGO BUG-02) Sin autenticacion responde 500

- **Descripcion:** `/api/auth/**` es publico en la cadena de seguridad, asi que el rechazo lo
  produce `@PreAuthorize` dentro del controlador y lo recoge el catch-all.
- **Request:** `POST /api/auth/logout-all` y `GET /api/auth/sessions` sin cabecera.
- **Resultado esperado (hoy):** 500 `"Error interno del servidor"`.
- **Resultado correcto:** 401 o 403.

## Pruebas de error

### REFRESH-P02 — Dos sesiones en el mismo segundo (antes REFRESH-E01, hallazgo BUG-03 corregido)

- **Descripcion:** cada refresh token lleva un `jti` aleatorio; sin el, dos emisiones seguidas
  del mismo usuario producian la misma cadena y chocaban con la restriccion de unicidad.
- **Request:** dos inicios de sesion seguidos del mismo usuario.
- **Resultado esperado:** 200 en ambos y dos filas en `session_tokens` con refresh tokens
  distintos.
