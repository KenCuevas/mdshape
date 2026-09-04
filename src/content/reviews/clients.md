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

- **Resultado esperado:** el cliente queda en la cartera y aparece en el listado con
  `blocked: false`.

### CLI-P02 — Busqueda y ficha

- **Precondiciones:** un cliente con nombre, correo y telefono.
- **Request:** `GET /api/clients/search?q=Pedro` y despues la ficha por id.
- **Resultado esperado:** 200 en ambos, con el cliente correcto.

### CLI-P03 — Bloquear y desbloquear

- **Resultado esperado:** 204 en ambas operaciones y el campo `blocked` cambiando en base de
  datos.

### BLOCK-P01 — Lista de vetados

- **Request:** alta con correo y telefono, listado y baja por id.
- **Resultado esperado:** la entrada aparece en el listado, queda una fila, y tras la baja no
  queda ninguna. Es la lista que hace que una reserva publica de ese contacto responda 422.

### DEP-P01 — Exigencia de deposito por cliente

- **Request:** correo, porcentaje 50 y motivo.
- **Resultado esperado:** la fila se guarda con su porcentaje y el listado responde 200.

## Pruebas negativas

### CLI-N01 — Alta invalida

- **Request:** nombre vacio; despues, correo mal formado.
- **Resultado esperado:** 400 con `details[0].field = "name"` en el primero y 400 en el
  segundo. Ningun cliente creado.

### BLOCK-N01 — Entrada sin ningun contacto

- **Descripcion:** el esquema exige correo o telefono (`chk_blocklist_contact`).
- **Resultado esperado:** la peticion se rechaza y no queda ninguna fila.

### DEP-N01 — Porcentaje fuera de rango

- **Request:** `percent: 150`.
- **Resultado esperado:** rechazo (el esquema exige entre 1 y 100) y ninguna fila guardada.

## Pruebas de seguridad

### CLI-S01 — Clientes de otra empresa

- **Resultado esperado:** consultar la ficha o bloquear a un cliente ajeno devuelve error de
  cliente, y ese cliente sigue sin bloquear.

### CLI-S02 — La cartera exige autenticacion

- **Resultado esperado:** 403 sin cabecera en clientes, vetados y depositos.
