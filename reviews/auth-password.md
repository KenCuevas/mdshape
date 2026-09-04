# Epica: auth-password

Cambio de contrasena estando dentro, y recuperacion desde fuera con un codigo enviado por
correo.

**Endpoints**

| Metodo | Ruta | Acceso |
| :--- | :--- | :--- |
| POST | `/api/auth/change-password` | `@PreAuthorize("isAuthenticated()")` |
| POST | `/api/auth/forgot-password` | publico, **sin limite** |
| POST | `/api/auth/reset-password` | publico, **sin limite** |

**Tests:** `reviews/auth/AuthPasswordApiTest` — 13 escenarios

**Reglas:** minimo ocho caracteres, sin exigencias de composicion; la nueva no puede ser igual
a la anterior al cambiarla desde dentro; cualquier cambio revoca **todas** las sesiones del
usuario; el codigo de recuperacion comparte tabla y reglas con el de verificacion.

---

## Pruebas positivas

### CHPWD-P01 — Cambio de contrasena

- **Descripcion:** el caso normal de cambio de contrasena autenticado: revoca todas las
  sesiones activas, incluida la que hizo la peticion, y envia el aviso de cambio.
- **Precondiciones:** usuario autenticado con dos sesiones abiertas.
- **Request:** `POST /api/auth/change-password` con la actual y la nueva.
- **Resultado esperado:** 200 `"Contrasena actualizada"`. Ninguna sesion activa; el token que
  hizo la peticion deja de valer; se puede iniciar sesion con la nueva contrasena y no con la
  vieja; se envia el aviso de cambio con IP y agente.

### FORGOT-P01 — Solicitud de recuperacion

- **Descripcion:** el caso normal: crea un codigo en `email_otps` y envia el correo de
  recuperacion con ese mismo codigo.
- **Resultado esperado:** 200 `"Si el correo existe, se envio un codigo de recuperacion"`, una
  sola fila en `email_otps` y el correo de recuperacion enviado con ese codigo.

### FORGOT-P02 — Correo desconocido

- **Descripcion:** un correo desconocido responde igual que uno valido, sin crear codigo
  ni enviar correo — la base de la comparacion con **FORGOT-N01**.
- **Resultado esperado:** 200 con el mismo mensaje y **sin** enviar correo ni crear codigos.

### RESET-P01 — Restablecimiento con el codigo correcto

- **Descripcion:** el caso normal: verifica el efecto completo del restablecimiento, que
  borra los codigos, revoca las sesiones y deja el codigo usado inservible.
- **Precondiciones:** codigo vigente obtenido con `forgot-password` y una sesion abierta.
- **Resultado esperado:** 200 `"Contrasena actualizada"`. Se borran todos los codigos del
  usuario, se revocan sus sesiones y la nueva contrasena permite iniciar sesion. Reutilizar el
  codigo devuelve 400.

## Pruebas negativas

### CHPWD-N01 — Contrasena actual incorrecta o repetida

- **Descripcion:** cubre las dos formas de rechazar el cambio: contrasena actual
  equivocada y nueva igual a la anterior.
- **Resultado esperado:** 400 `"La contrasena actual es incorrecta"` y, en el otro caso, 400
  `"La nueva contrasena no puede ser igual a la anterior"`. La contrasena no cambia.

### CHPWD-N02 — Cuerpo invalido

- **Descripcion:** valida el minimo de ocho caracteres en la nueva contrasena y que
  `currentPassword` tambien sea obligatorio.
- **Request:** actual vacia y nueva de cinco caracteres.
- **Resultado esperado:** 400 con `details` para `currentPassword` y `newPassword`.

### RESET-N02 — Cuenta desactivada o correo desconocido

- **Descripcion:** distingue la cuenta desactivada, que responde 409, del correo
  desconocido, que responde 400 generico.
- **Resultado esperado:** 409 `"La cuenta no esta habilitada"` para la cuenta inactiva; 400
  generico `"Codigo invalido o expirado"` para el correo que no existe.

### RESET-N03 — Codigo caducado

- **Descripcion:** un codigo vencido se rechaza aunque el valor enviado sea el correcto.
- **Resultado esperado:** 400 aunque el codigo enviado sea el correcto.

### FORGOT-N01 — (HALLAZGO SEC-05) Cuenta existente sin verificar

- **Descripcion:** la respuesta delata el estado de la cuenta.
- **Resultado esperado (hoy):** 409 `"La cuenta no ha sido verificada"`, frente al 200
  silencioso de un correo inexistente.
- **Resultado correcto:** 200 con el mismo mensaje neutro en ambos casos.

## Pruebas de seguridad

### RESET-N01 y RESET-S01 — (HALLAZGO SEC-02, critico) El codigo no se bloquea

- **Descripcion:** igual que en la verificacion, el contador de intentos se pierde con el
  rollback.
- **Request:** veinte codigos incorrectos y despues el correcto.
- **Resultado esperado (hoy):** `attempts` sigue en 0 y el codigo correcto restablece la
  contrasena. Sin limite de intentos ni rate limiting, el codigo se puede adivinar.
- **Resultado correcto:** bloqueo al quinto intento.

### RESET-S02 — (HALLAZGO SEC-06) Sin limite en la recuperacion

- **Descripcion:** sin limite de peticiones, un tercero puede invalidar repetidamente el
  codigo que la victima acaba de recibir.
- **Request:** ocho llamadas seguidas a `forgot-password`.
- **Resultado esperado (hoy):** ocho correos, ningun 429, y solo el ultimo codigo sirve: un
  tercero puede anular indefinidamente el enlace que la victima acaba de recibir.
- **Resultado correcto:** 429 a partir de unas pocas peticiones por correo y por IP.

## Pruebas de error

### RESET-E01 — Un restablecimiento fallido no deja datos a medias

- **Descripcion:** un restablecimiento fallido no deja efectos a medias: ni el hash
  cambia ni el codigo se consume.
- **Request:** restablecimiento con un codigo incorrecto.
- **Resultado esperado:** 400, el hash de la contrasena intacto y el codigo original todavia
  sin usar.
