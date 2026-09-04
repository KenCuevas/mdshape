# Epica: account

Perfil del profesional, estado de su suscripcion, exportacion de sus datos personales y
eliminacion de la cuenta. Es la parte con implicaciones de cumplimiento: la exportacion y el
borrado son requisitos de las tiendas de aplicaciones.

**Endpoints**

| Metodo | Ruta | Acceso |
| :--- | :--- | :--- |
| GET | `/api/me` | autenticado, cacheado 30 min |
| GET | `/api/subscription/status` | autenticado |
| GET | `/api/v1/account/export` | autenticado, `@RateLimited(5, 1h)` |
| POST | `/api/v1/account/delete-request` | autenticado |
| DELETE | `/api/v1/account` | autenticado (delega en el anterior) |
| GET | `/api/v1/account/delete-request/status` | autenticado |

**Tests:** `reviews/account/AccountApiTest` — 12 escenarios

**Configuracion en la suite:** `account.deletion.mode=immediate` y
`require-password=true`, que son los valores por defecto de produccion.

---

## Pruebas positivas

### ME-P01 — Perfil

- **Descripcion:** el caso normal de `GET /api/me`; comprueba que el perfil devuelve correo,
  verificacion, roles y la lista de empresas con su plan.
- **Precondiciones:** profesional con una empresa en plan `pro` activo.
- **Resultado esperado:** 200 `"Perfil obtenido"` con correo, estado de verificacion, roles y
  la lista de empresas con su plan.

### ME-P02 — Plan vencido

- **Descripcion:** verifica que `planStatus` se calcula a partir de la fecha de vencimiento en
  vez de leerse tal cual de la base.
- **Precondiciones:** empresa con `plan_status = 'active'`, `will_renew = false` y
  `plan_expires_at` en el pasado.
- **Resultado esperado:** `planStatus: "expired"`. El estado se deriva, no se lee tal cual de
  la base.

### SUB-P01 — Estado de suscripcion

- **Descripcion:** comprueba los dos estados posibles de `GET /api/subscription/status`, con y
  sin suscripcion activa.
- **Resultado esperado:** `planId: "none"` sin suscripcion; `planId: "pro"` con `status:
  "active"` cuando la hay.

### EXPORT-P01 — Exportacion de datos personales

- **Descripcion:** exportacion completa de los datos personales; comprueba el nombre del
  archivo, la version del formato y que el perfil y las empresas con sus clientes viajan en el
  JSON.
- **Precondiciones:** empresa con ubicacion y un cliente.
- **Resultado esperado:** 200 con `Content-Disposition: attachment; filename=
  "agendally-datos-<id>.json"`, `formatVersion: "agendally-account-export-v1"`, el perfil con
  su bloque de consentimiento y las empresas con sus clientes.

### DEL-P01 — Eliminacion inmediata

- **Descripcion:** elimina la cuenta de forma inmediata y comprueba el borrado en cascada de
  sesiones, tokens push, notificaciones y codigos, y que el token deja de valer al instante.
- **Precondiciones:** usuario con sesion, token push, notificacion y codigo pendiente.
- **Request:** `POST /api/v1/account/delete-request` con la contrasena.
- **Resultado esperado:** 200 con `success: true` y `deletionType: "immediate"`. Desaparecen
  el usuario y, en cascada, sus sesiones, tokens push, notificaciones y codigos; queda la
  solicitud en `COMPLETED`; el token deja de valer al instante.

### DEL-P02 — Estado sin solicitud

- **Descripcion:** consulta el estado de eliminacion cuando no hay ninguna solicitud en curso.
- **Resultado esperado:** 200 con `status: "none"` y `"No existe solicitud de eliminacion"`.

## Pruebas negativas

### DEL-N01 — Contrasena incorrecta o ausente

- **Descripcion:** la eliminacion de cuenta exige confirmar la contrasena; sin ella o con una
  incorrecta, la cuenta no se toca.
- **Resultado esperado:** 400 `"Credenciales invalidas"` y 400 `"Debes confirmar tu contrasena
  para eliminar la cuenta"`. La cuenta sigue existiendo en ambos casos.

### DEL-N02 — Razon demasiado larga

- **Descripcion:** valida el limite de longitud del campo `reason` en la solicitud de
  eliminacion.
- **Request:** `reason` de 501 caracteres.
- **Resultado esperado:** 400 con `details[0].field = "reason"` y la cuenta intacta.

### DEL-N03 — Solicitud ya en curso

- **Descripcion:** no se puede abrir una segunda solicitud de eliminacion mientras ya hay una
  pendiente.
- **Precondiciones:** una solicitud en `PENDING`.
- **Resultado esperado:** 409 `"Ya existe una solicitud de eliminacion en proceso"`, y el
  estado responde `pending` con `deletionType: "scheduled"`.

## Pruebas de seguridad

### EXPORT-S01 — La exportacion no incluye secretos

- **Descripcion:** comprueba que la exportacion nunca revela el hash de la contrasena ni el
  numero de cuenta bancaria completo.
- **Resultado esperado:** el JSON no contiene el hash de la contrasena ni el numero de cuenta
  bancaria cifrado; de las cuentas solo salen los cuatro ultimos digitos.

### EXPORT-S02 — Limite de exportaciones

- **Descripcion:** el limite de `@RateLimited(5, 1h)` en la exportacion, para evitar que se use
  como canal de extraccion masiva.
- **Resultado esperado:** las cinco primeras de una hora responden 200 y la sexta 429. Evita
  usar la exportacion como canal de extraccion masiva.

### DEL-S01 — Los endpoints de cuenta exigen autenticacion

- **Descripcion:** exportacion, estado y solicitud de borrado responden 403 sin cabecera de
  autenticacion.
- **Resultado esperado:** 403 sin cabecera en exportacion, estado y solicitud de borrado.
