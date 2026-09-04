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

- **Precondiciones:** profesional con una empresa en plan `pro` activo.
- **Resultado esperado:** 200 `"Perfil obtenido"` con correo, estado de verificacion, roles y
  la lista de empresas con su plan.

### ME-P02 — Plan vencido

- **Precondiciones:** empresa con `plan_status = 'active'`, `will_renew = false` y
  `plan_expires_at` en el pasado.
- **Resultado esperado:** `planStatus: "expired"`. El estado se deriva, no se lee tal cual de
  la base.

### SUB-P01 — Estado de suscripcion

- **Resultado esperado:** `planId: "none"` sin suscripcion; `planId: "pro"` con `status:
  "active"` cuando la hay.

### EXPORT-P01 — Exportacion de datos personales

- **Precondiciones:** empresa con ubicacion y un cliente.
- **Resultado esperado:** 200 con `Content-Disposition: attachment; filename=
  "agendally-datos-<id>.json"`, `formatVersion: "agendally-account-export-v1"`, el perfil con
  su bloque de consentimiento y las empresas con sus clientes.

### DEL-P01 — Eliminacion inmediata

- **Precondiciones:** usuario con sesion, token push, notificacion y codigo pendiente.
- **Request:** `POST /api/v1/account/delete-request` con la contrasena.
- **Resultado esperado:** 200 con `success: true` y `deletionType: "immediate"`. Desaparecen
  el usuario y, en cascada, sus sesiones, tokens push, notificaciones y codigos; queda la
  solicitud en `COMPLETED`; el token deja de valer al instante.

### DEL-P02 — Estado sin solicitud

- **Resultado esperado:** 200 con `status: "none"` y `"No existe solicitud de eliminacion"`.

## Pruebas negativas

### DEL-N01 — Contrasena incorrecta o ausente

- **Resultado esperado:** 400 `"Credenciales invalidas"` y 400 `"Debes confirmar tu contrasena
  para eliminar la cuenta"`. La cuenta sigue existiendo en ambos casos.

### DEL-N02 — Razon demasiado larga

- **Request:** `reason` de 501 caracteres.
- **Resultado esperado:** 400 con `details[0].field = "reason"` y la cuenta intacta.

### DEL-N03 — Solicitud ya en curso

- **Precondiciones:** una solicitud en `PENDING`.
- **Resultado esperado:** 409 `"Ya existe una solicitud de eliminacion en proceso"`, y el
  estado responde `pending` con `deletionType: "scheduled"`.

## Pruebas de seguridad

### EXPORT-S01 — La exportacion no incluye secretos

- **Resultado esperado:** el JSON no contiene el hash de la contrasena ni el numero de cuenta
  bancaria cifrado; de las cuentas solo salen los cuatro ultimos digitos.

### EXPORT-S02 — Limite de exportaciones

- **Resultado esperado:** las cinco primeras de una hora responden 200 y la sexta 429. Evita
  usar la exportacion como canal de extraccion masiva.

### DEL-S01 — Los endpoints de cuenta exigen autenticacion

- **Resultado esperado:** 403 sin cabecera en exportacion, estado y solicitud de borrado.
