# Epica: admin

Panel de la plataforma: 44 endpoints bajo `/api/admin` para soporte y operaciones. Todos
comparten una unica puerta —la cadena de seguridad exige `hasRole('ADMIN')` antes de llegar al
controlador— y un aspecto que registra cada escritura en `admin_audit_log`.

**Endpoints** (muestra; el inventario completo esta en la matriz de cobertura)

| Area | Rutas |
| :--- | :--- |
| Usuarios | `/users`, `/users/{id}`, `/disable`, `/enable`, `/verify`, `/sessions`, `/roles/{rol}` |
| Empresas y citas | `/companies`, `/companies/{id}`, `/appointments`, `/appointments/{id}` |
| Estadisticas | `/stats` y once variantes |
| Moderacion | `/media/images`, `/approve`, `/reject` |
| Operaciones | `/whatsapp-jobs`, `/reviews/pending`, `/account-deletions`, `/banks`, `/audit-log` |

**Tests:** `reviews/admin/AdminApiTest` — 11 escenarios

**Criterio de cobertura:** no se prueban los 44 endpoints uno por uno. Se prueban los dos
mecanismos que comparten (autorizacion por rol y auditoria), las acciones de escritura que
tienen consecuencias sobre una cuenta, y una muestra amplia de las consultas de solo lectura.

---

## Pruebas positivas

### ADM-P01 — Buscador y ficha de usuario

- **Descripcion:** busqueda de usuarios y consulta de la ficha individual, comprobando el
  listado y el correo devuelto.
- **Resultado esperado:** 200 con el sobre habitual en el listado, y la ficha con el correo
  del usuario consultado.

### ADM-P02 — Desactivar y reactivar una cuenta

- **Descripcion:** desactivar y reactivar una cuenta cambia `is_active` y deja su rastro en la
  bitacora de administracion.
- **Resultado esperado:** `is_active` cambia en cada operacion y quedan al menos dos entradas
  en la bitacora de administracion.

### ADM-P03 — Revocar todas las sesiones de un usuario

- **Descripcion:** revocar las sesiones de un usuario invalida su token sin borrar la cuenta.
- **Resultado esperado:** ninguna sesion activa, la cuenta **no** se borra, y el token del
  usuario deja de valer.

### ADM-P04 — Asignar y retirar roles

- **Descripcion:** asignar y retirar un rol crea y elimina la fila correspondiente en
  `user_roles`.
- **Resultado esperado:** la fila de `user_roles` aparece y desaparece con cada operacion.

### ADM-P05 — Consultas de solo lectura

- **Descripcion:** barrido de trece endpoints de solo lectura del panel, comprobando que todos
  responden 200.
- **Request:** trece endpoints de consulta (empresas, citas, estadisticas, feedback, bancos,
  bitacora, eliminaciones, trabajos de WhatsApp, moderacion de imagenes, resenas pendientes).
- **Resultado esperado:** 200 en todos.

## Pruebas negativas

### ADM-N01 — Usuario inexistente

- **Descripcion:** consultar un usuario que no existe da un error de cliente controlado, sin
  trazas ni efectos secundarios.
- **Resultado esperado:** error de cliente (400 o 404), sin efectos y sin filtrar trazas.

### ADM-N02 — Parametros de busqueda invalidos

- **Descripcion:** parametros de paginacion invalidos (`page=-5&size=0`) no exponen detalles
  internos en la respuesta.
- **Request:** `page=-5&size=0`.
- **Resultado esperado:** la API responde sin exponer detalles internos.

## Pruebas de seguridad

### ADM-S01 — Desactivar corta el acceso al instante

- **Descripcion:** comprueba que no hay ventana de tiempo en la que el token de una cuenta
  recien desactivada siga sirviendo.
- **Request:** el profesional consulta su perfil, el administrador lo desactiva, el
  profesional lo vuelve a intentar.
- **Resultado esperado:** 200 y despues 401 o 403. No hay ventana en la que un token de una
  cuenta desactivada siga sirviendo.

### ADM-S02 — Toda escritura queda auditada

- **Descripcion:** una escritura del panel (verificar un usuario) deja una entrada en
  `admin_audit_log` con quien la hizo y que accion fue.
- **Request:** verificar manualmente un usuario.
- **Resultado esperado:** una entrada en `admin_audit_log` con el id y el correo del
  administrador y el nombre de la accion.

### ADM-S03 — El panel no ve el numero de cuenta completo

- **Descripcion:** la ficha de empresa solo expone los cuatro ultimos digitos de la cuenta
  bancaria, nunca el numero cifrado ni el HMAC.
- **Precondiciones:** una cuenta bancaria cifrada en la empresa.
- **Resultado esperado:** la ficha de la empresa muestra los cuatro ultimos digitos y nunca el
  numero cifrado ni el HMAC.

### ADM-S04 — El panel esta cerrado para todos los demas

- **Descripcion:** un profesional sin rol admin no puede desactivar usuarios ni revocar sus
  sesiones; la cadena de seguridad corta antes de llegar al controlador.
- **Request:** un profesional intenta desactivar a otro usuario y revocar sus sesiones.
- **Resultado esperado:** 403 en ambos y la victima intacta. La cadena de seguridad corta
  antes del controlador, asi que ni siquiera se ejecuta la accion.
