# Epica: notifications

Bandeja de notificaciones dentro de la aplicacion, registro de dispositivos para las
notificaciones push y envio de feedback desde la app.

**Endpoints**

| Metodo | Ruta | Acceso |
| :--- | :--- | :--- |
| GET | `/api/v1/notifications`, `/unread-count` | autenticado |
| PUT | `/api/v1/notifications/{id}/read`, `/read-all` | autenticado |
| DELETE | `/api/v1/notifications/{id}`, `/api/v1/notifications` | autenticado |
| POST | `/api/v1/push-tokens` | autenticado, `@RateLimited(10, 1m)` |
| DELETE | `/api/v1/push-tokens` | autenticado |
| POST | `/api/v1/feedback/report-problem`, `/suggest-improvement` | autenticado, `@RateLimited(10, 1d)` |

**Tests:** `reviews/notifications/NotificationsPushFeedbackApiTest` — 13 escenarios

**Nota sobre el contrato:** los endpoints de notificaciones **no** usan el sobre
`ApiResponse`; devuelven la lista o el mapa directamente. Los de push y feedback si lo usan.

---

## Pruebas positivas

### NOTIF-P01 — Bandeja y contador

- **Precondiciones:** dos notificaciones propias (una leida) y una de otro usuario.
- **Resultado esperado:** la lista trae dos entradas, ninguna ajena, y `unreadCount` vale 1.

### NOTIF-P02 — Marcar como leidas

- **Resultado esperado:** marcar una la deja leida; marcar todas deja el contador de no leidas
  en cero.

### NOTIF-P03 — Borrado

- **Resultado esperado:** borrar una devuelve 204; borrarlas todas devuelve 204 y deja la
  bandeja vacia.

### PUSH-P01 — Registro de dispositivo

- **Request:** token con formato `ExponentPushToken[...]`, proveedor `expo` y plataforma
  `android`.
- **Resultado esperado:** 201 `"Token push registrado"` la primera vez y 200 `"Token push
  actualizado"` al repetirlo, con **una sola** fila en `push_tokens`.

### PUSH-P02 — Baja del dispositivo

- **Resultado esperado:** 200 con `deactivated: true`; la fila se queda pero con
  `is_active = false`, para no perder el historial del dispositivo.

### FEED-P01 — Reporte de problema

- **Request:** asunto y descripcion, con `User-Agent` y `X-Forwarded-For`.
- **Resultado esperado:** 201 `"Problema reportado correctamente"` con `type:
  "PROBLEM_REPORT"`. Se guardan la IP del cliente (la primera del `X-Forwarded-For`) y el
  agente.

### FEED-P02 — Sugerencia de mejora

- **Request:** campo `suggestion`.
- **Resultado esperado:** 201 `"Sugerencia enviada correctamente"` y la fila guardada con su
  tipo.

## Pruebas negativas

### NOTIF-N01 — Casos de error de la bandeja

- **Resultado esperado:** notificacion inexistente, 404; sin cabecera, 403; con token
  invalido, 401.

### PUSH-N01 — Validaciones del token push

- **Request:** token sin el formato de Expo, proveedor `fcm` y plataforma `windows`.
- **Resultado esperado:** 400 en los tres casos, con `details[0].field` apuntando a `token`,
  `provider` y `platform` respectivamente. Ninguna fila creada.

### FEED-N01 — Validaciones del feedback

- **Request:** asunto y descripcion vacios; despues, asunto de 256 caracteres.
- **Resultado esperado:** 400 con los campos senalados y sin guardar nada.

## Pruebas de seguridad

### NOTIF-S01 — Notificaciones de otro usuario

- **Resultado esperado:** borrarla o marcarla como leida devuelve 403 y la fila sigue igual,
  sin leer.

### PUSH-S01 — Limite de registros

- **Resultado esperado:** diez registros en un minuto responden 201 y el siguiente 429.

### FEED-S01 — El feedback exige autenticacion

- **Resultado esperado:** 403 sin cabecera y 401 con un token invalido; nada guardado.
