# Epica: error-handling

Que la API falle bien: el formato de la respuesta de error, que no se filtre nada interno y
que una peticion rechazada no deje datos a medias.

No se trata de provocar errores por provocarlos, sino de comprobar que ante una condicion
invalida o excepcional la API devuelve el estado adecuado, con un cuerpo consistente, sin
trazas, y sin haber hecho a medias la operacion que rechazo.

**Que se cubre:** `GlobalExceptionHandler`, el sobre `ApiResponse`, los codigos de negocio
`AGEND-*`, la atomicidad de las transacciones y el comportamiento cuando un servicio externo
no esta disponible.

**Tests:** `reviews/errorhandling/ErrorHandlingApiTest` — 11 escenarios

**El sobre de error**

```json
{"request_id": "...", "status": "FAILURE|ERROR", "code": 401, "message": "...",
 "details": [{"field": "email", "error": "..."}], "error_code": "AGEND-0001"}
```

`status` es `FAILURE` para 4xx y `ERROR` para 5xx. `details` solo aparece en errores de
validacion y `error_code` solo en errores de negocio.

---

## Pruebas positivas

### ERR-P01 — El sobre es siempre el mismo

- **Request:** login con credenciales incorrectas.
- **Resultado esperado:** 401 con `request_id`, `status: FAILURE`, `code: 401`, `message`, sin
  `data`, y sin trazas ni nombres de clase de Java, Spring o PostgreSQL en el cuerpo.

### ERR-P02 — Errores de validacion

- **Resultado esperado:** 400 con `message: "Solicitud invalida"` y `details` como lista, con
  `field` y `error` en cada entrada.

### ERR-P03 — Recurso inexistente

- **Request:** borrar una notificacion y una sesion que no existen.
- **Resultado esperado:** 404 con el mensaje de negocio (`"Sesion no encontrada"`).

### ERR-P04 — Atomicidad

- **Descripcion:** el alta de una cita resuelve el cliente y los servicios antes de validar el
  horario; si la transaccion no fuese atomica quedaria el cliente creado.
- **Request:** cita fuera del horario laboral.
- **Resultado esperado:** 400, cero citas y **cero clientes**.

### ERR-P05 — Codigos de negocio estables

- **Request:** perfil publico de una empresa sin servicios activos.
- **Resultado esperado:** `error_code: "AGEND-0001"` con su mensaje. El codigo es estable
  aunque cambie el texto, que es lo que permite a soporte identificar el caso.

### ERR-P06 — Servicio externo no disponible

- **Request:** pedir una subida de logo sin Cloudinary configurado.
- **Resultado esperado:** respuesta controlada (503 con `AGEND-MEDIA-0001`), sin filtrar
  detalles. La falta de un proveedor externo no se convierte en un error opaco.

### ERR-P08 — Un fallo de correo no deja el codigo huerfano

- **Descripcion:** en produccion el correo es asincrono y su fallo nunca llega a la peticion;
  aqui se fuerza el fallo sincrono para comprobar la atomicidad.
- **Resultado esperado:** la peticion falla y **no** queda ningun codigo de recuperacion
  guardado: o se guarda y se envia, o no se hace nada.

## Pruebas negativas

### ERR-N01 — (HALLAZGO BUG-05) Peticiones malformadas

- **Request:** JSON roto, `Content-Type: text/plain` y verbo `PUT` sobre un endpoint de `POST`.
- **Resultado esperado (hoy):** 500 en los tres, con el cuerpo generico y sin filtrar nada.
- **Resultado correcto:** 400, 415 y 405 respectivamente.

### ERR-N02 — (HALLAZGO BUG-05) Ruta inexistente

- **Resultado esperado (hoy):** 500 en vez de 404, y una entrada de error con traza en los
  logs por cada peticion a una ruta que no existe.

### ERR-N03 — Identificador mal formado en la ruta

- **Request:** `DELETE /api/v1/notifications/no-es-un-numero`.
- **Resultado esperado:** la API responde sin filtrar la excepcion. El estado exacto queda
  documentado por el test.

### ERR-N04 — (HALLAZGO BUG-05) Booleano obligatorio ausente

- **Request:** alta con cuerpo `{}`.
- **Resultado esperado (hoy):** 500, porque `termsAccepted` es un `boolean` primitivo y
  Jackson no puede mapear un nulo. Ningun usuario creado.
- **Resultado correcto:** 400 con los campos que faltan.
