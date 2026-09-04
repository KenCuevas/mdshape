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

- **Descripcion:** comprueba que la bandeja solo devuelve notificaciones propias y que
  `unreadCount` cuenta solo las no leidas.
- **Precondiciones:** dos notificaciones propias (una leida) y una de otro usuario.
- **Resultado esperado:** la lista trae dos entradas, ninguna ajena, y `unreadCount` vale 1.

### NOTIF-P02 — Marcar como leidas

- **Descripcion:** comprueba que marcar una notificacion y marcar todas actualizan el estado
  leido y el contador de no leidas de forma consistente.
- **Resultado esperado:** marcar una la deja leida; marcar todas deja el contador de no leidas
  en cero.

### NOTIF-P03 — Borrado

- **Descripcion:** comprueba que borrar una notificacion y borrarlas todas responden 204 y que
  el borrado masivo deja la bandeja vacia.
- **Resultado esperado:** borrar una devuelve 204; borrarlas todas devuelve 204 y deja la
  bandeja vacia.

### PUSH-P01 — Registro de dispositivo

- **Descripcion:** comprueba que registrar el mismo token dos veces no duplica la fila: la
  primera vez responde 201 y la segunda 200, con una sola fila en `push_tokens`.
- **Request:** token con formato `ExponentPushToken[...]`, proveedor `expo` y plataforma
  `android`.
- **Resultado esperado:** 201 `"Token push registrado"` la primera vez y 200 `"Token push
  actualizado"` al repetirlo, con **una sola** fila en `push_tokens`.

### PUSH-P02 — Baja del dispositivo

- **Descripcion:** comprueba que dar de baja el dispositivo no borra la fila, solo la marca con
  `is_active = false`, para conservar el historial.
- **Resultado esperado:** 200 con `deactivated: true`; la fila se queda pero con
  `is_active = false`, para no perder el historial del dispositivo.

### FEED-P01 — Reporte de problema

- **Descripcion:** comprueba que el reporte de problema guarda la IP del cliente (la primera
  del `X-Forwarded-For`) y el `User-Agent` junto con el mensaje.
- **Request:** asunto y descripcion, con `User-Agent` y `X-Forwarded-For`.
- **Resultado esperado:** 201 `"Problema reportado correctamente"` con `type:
  "PROBLEM_REPORT"`. Se guardan la IP del cliente (la primera del `X-Forwarded-For`) y el
  agente.

### FEED-P02 — Sugerencia de mejora

- **Descripcion:** comprueba que enviar una sugerencia de mejora devuelve 201 y guarda la fila
  con su tipo correspondiente.
- **Request:** campo `suggestion`.
- **Resultado esperado:** 201 `"Sugerencia enviada correctamente"` y la fila guardada con su
  tipo.

## Pruebas negativas

### NOTIF-N01 — Casos de error de la bandeja

- **Descripcion:** comprueba los tres casos de error de la bandeja: recurso inexistente,
  peticion sin autenticar y token invalido.
- **Resultado esperado:** notificacion inexistente, 404; sin cabecera, 403; con token
  invalido, 401.

### PUSH-N01 — Validaciones del token push

- **Descripcion:** comprueba que un token, proveedor o plataforma invalidos se rechazan con 400
  y el campo correcto senalado en `details`, sin crear ninguna fila.
- **Request:** token sin el formato de Expo, proveedor `fcm` y plataforma `windows`.
- **Resultado esperado:** 400 en los tres casos, con `details[0].field` apuntando a `token`,
  `provider` y `platform` respectivamente. Ninguna fila creada.

### FEED-N01 — Validaciones del feedback

- **Descripcion:** comprueba que un asunto o descripcion vacios, y un asunto demasiado largo,
  se rechazan con 400 sin guardar nada.
- **Request:** asunto y descripcion vacios; despues, asunto de 256 caracteres.
- **Resultado esperado:** 400 con los campos senalados y sin guardar nada.

## Pruebas de seguridad

### NOTIF-S01 — Notificaciones de otro usuario

- **Descripcion:** comprueba que no se puede borrar ni marcar como leida una notificacion de
  otro usuario: responde 403 y la fila queda igual.
- **Resultado esperado:** borrarla o marcarla como leida devuelve 403 y la fila sigue igual,
  sin leer.

### PUSH-S01 — Limite de registros

- **Descripcion:** comprueba el limite de diez registros de push por minuto: la peticion numero
  once responde 429.
- **Resultado esperado:** diez registros en un minuto responden 201 y el siguiente 429.

### FEED-S01 — El feedback exige autenticacion

- **Descripcion:** comprueba que el feedback exige autenticacion: sin cabecera responde 403,
  con un token invalido 401, y no se guarda nada en ningun caso.
- **Resultado esperado:** 403 sin cabecera y 401 con un token invalido; nada guardado.
