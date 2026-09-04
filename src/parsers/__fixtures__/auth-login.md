# Epica: auth-login

Cubre el inicio de sesion con email y contrasena, la emision de tokens y el
bloqueo por intentos fallidos.

**Endpoint:** `POST /api/auth/login`
**Implementacion:** `src/modules/auth/login.controller.ts`
**Tests:** `tests/auth/login.spec.ts`

**Contrato de la peticion**

| Campo | Tipo | Obligatorio |
| --- | --- | --- |
| email | string | si |
| password | string | si |

**Reglas clave**

| Regla | Detalle |
| --- | --- |
| Bloqueo | 5 intentos fallidos bloquean 15 minutos |

---

## Pruebas positivas

### LOGIN-P01 — Credenciales validas

- **Descripcion:** el caso normal de un usuario verificado.
- **Precondiciones:** usuario verificado y activo.
- **Request:** `POST /api/auth/login` con `{ "email": "a@b.c", "password": "x" }`.
- **Resultado esperado:** 200. `status: SUCCESS` y tokens en la respuesta.

### RESEND-P01 / OTP-N05 — Reenvio dentro de la ventana

- **Descripcion:** el reenvio comparte contenido con el limite de OTP.
- **Resultado esperado:** 200.

### OTP-N01 y OTP-N02 — El limite de intentos se aplica

- **Descripcion:** dos identificadores con la conjuncion `y`.
- **Resultado esperado:** 429.

## Pruebas negativas

### LOGIN-N01 — Contrasena incorrecta

- **Descripcion:** contrasena erronea.
- **Resultado esperado (hoy):** 200 con `status: ERROR`.
- **Resultado correcto:** 401.
- **Nota:** ver [la estrategia](../test-strategy.md#errores).
- **Impacto:** enumeracion de usuarios.
- **Por que importa:** permite distinguir cuentas existentes.

### LOGIN-N02 — Body con listado

- **Descripcion:** primera linea
  con continuacion indentada.
- **Precondiciones:**
  - usuario activo
  - sin sesiones abiertas
- **Request:**

  ```json
  { "email": "a@b.c" }
  ```

- **Resultado esperado:** 400.

Parrafo libre despues de las vinetas.

## Pruebas de seguridad

### OTP-S01 — (HALLAZGO SEC-01, critico) verify-otp entrega tokens sin validar

- **Descripcion:** verify-otp devuelve tokens aunque el codigo no coincida.
- **Resultado esperado (hoy):** 200 con tokens.
- **Resultado correcto:** 401.

### LOGIN-S02 — (HALLAZGO BUG-06) Marcador sin severidad

- **Descripcion:** marcador sin severidad.

## Pruebas de error

### LOGIN-E01 — Base de datos caida

- **Descripcion:** el servicio de base de datos no responde.
- **Resultado esperado:** 503.
