# Epica: infra

Comprobaciones del propio entorno de pruebas. Corren antes que el resto y, si fallan, todo lo
demas es ruido: no tiene sentido investigar un 500 en una reserva si el esquema no se
construyo bien.

**Tests:** `reviews/infra/SmokeApiTest` — 3 escenarios

---

### INFRA-01 — Flyway aplica la cadena completa sobre una base vacia

- **Descripcion:** la base del contenedor arranca vacia y el contexto de Spring la migra al
  levantarse. Este test confirma que la cadena entera se aplico.
- **Precondiciones:** PostgreSQL 16 recien arrancado, sin esquema.
- **Resultado esperado:** al menos 75 migraciones aplicadas con exito, la ultima version es la
  `70` y los dos roles sembrados (`OWNER` y `ADMIN`) estan en su tabla.
- **Por que importa:** es la comprobacion de regresion de la reparacion de migraciones
  descrita en `test-strategy.md`. Si alguien vuelve a introducir una version duplicada o un
  `GRANT` a un rol inexistente, este test lo detecta en la siguiente ejecucion.

### INFRA-02 — Un token valido autentica de verdad

- **Descripcion:** comprueba de una vez la firma del token, la sesion en base de datos, la
  cadena de seguridad y el sobre de respuesta.
- **Request:** `GET /api/me` con un token generado por los fixtures.
- **Resultado esperado:** 200 con `X-Request-Id` en las cabeceras, `status: SUCCESS` y
  `request_id` en el cuerpo.

### INFRA-03 — La base queda limpia entre tests

- **Descripcion:** el aislamiento lo da el truncado previo a cada test, no una transaccion.
- **Resultado esperado:** al empezar un test no hay ningun usuario ni ninguna sesion, aunque
  el test anterior haya creado varios.
