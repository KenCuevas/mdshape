# Epica: clients

Cartera de clientes del profesional: alta manual, busqueda, ficha, bloqueo, lista de vetados y
exigencia de deposito.

**Endpoints**

| Metodo | Ruta |
| :--- | :--- |
| GET | `/api/clients`, `/api/clients/search`, `/api/clients/{id}`, `/api/clients/segments` |
| POST | `/api/clients` |
| PATCH | `/api/clients/{id}/block`, `/unblock` |
| GET/POST/DELETE | `/api/client-blocklist` |
| GET/POST/DELETE | `/api/client-deposit-requirements` |

**Tests:** `reviews/clients/ClientsApiTest` — 10 escenarios

**Notas del contrato:** estos endpoints devuelven la lista o el objeto **sin** el sobre
`ApiResponse`. En el alta manual solo el nombre es obligatorio, a proposito: el profesional
apunta a alguien que tiene delante y completa los datos despues.

---

## Pruebas positivas

### CLI-P01 — Alta manual con solo el nombre

- **Descripcion:** el alta minima: solo el nombre basta para crear el cliente y que
  aparezca en el listado.
- **Resultado esperado:** el cliente queda en la cartera y aparece en el listado con
  `blocked: false`.

### CLI-P02 — Busqueda y ficha

- **Descripcion:** comprueba la busqueda por nombre y que la ficha por id devuelva el
  mismo cliente.
- **Precondiciones:** un cliente con nombre, correo y telefono.
- **Request:** `GET /api/clients/search?q=Pedro` y despues la ficha por id.
- **Resultado esperado:** 200 en ambos, con el cliente correcto.

### CLI-P03 — Bloquear y desbloquear

- **Descripcion:** el ciclo completo de bloqueo y desbloqueo, verificando el campo
  `blocked` en base de datos.
- **Resultado esperado:** 204 en ambas operaciones y el campo `blocked` cambiando en base de
  datos.

### BLOCK-P01 — Lista de vetados

- **Descripcion:** el alta, listado y baja de un vetado, y su efecto: una reserva
  publica de ese contacto responde 422.
- **Request:** alta con correo y telefono, listado y baja por id.
- **Resultado esperado:** la entrada aparece en el listado, queda una fila, y tras la baja no
  queda ninguna. Es la lista que hace que una reserva publica de ese contacto responda 422.

### DEP-P01 — Exigencia de deposito por cliente

- **Descripcion:** el alta de una exigencia de deposito por cliente, con su porcentaje
  guardado y visible en el listado.
- **Request:** correo, porcentaje 50 y motivo.
- **Resultado esperado:** la fila se guarda con su porcentaje y el listado responde 200.

## Pruebas negativas

### CLI-N01 — Alta invalida

- **Descripcion:** cubre el nombre vacio y el correo mal formado, sin que ninguno de los
  dos cree un cliente.
- **Request:** nombre vacio; despues, correo mal formado.
- **Resultado esperado:** 400 con `details[0].field = "name"` en el primero y 400 en el
  segundo. Ningun cliente creado.

### BLOCK-N01 — Entrada sin ningun contacto

- **Descripcion:** el esquema exige correo o telefono (`chk_blocklist_contact`).
- **Resultado esperado:** la peticion se rechaza y no queda ninguna fila.

### DEP-N01 — Porcentaje fuera de rango

- **Descripcion:** el esquema exige un porcentaje entre 1 y 100, y lo comprueba con un
  valor fuera de rango.
- **Request:** `percent: 150`.
- **Resultado esperado:** rechazo (el esquema exige entre 1 y 100) y ninguna fila guardada.

## Pruebas de seguridad

### CLI-S01 — Clientes de otra empresa

- **Descripcion:** el aislamiento entre empresas: ni consultar ni bloquear un cliente
  ajeno tiene efecto.
- **Resultado esperado:** consultar la ficha o bloquear a un cliente ajeno devuelve error de
  cliente, y ese cliente sigue sin bloquear.

### CLI-S02 — La cartera exige autenticacion

- **Descripcion:** sin autenticacion, los tres endpoints de la cartera responden 403.
- **Resultado esperado:** 403 sin cabecera en clientes, vetados y depositos.
