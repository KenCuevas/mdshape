# Epica: infra-untyped

Comprobaciones del propio entorno de pruebas, sin secciones y con identificadores
que no llevan letra de tipo.

**Tests:** `reviews/infra/SmokeApiTest` — 3 escenarios

---

### INFRA-01 — Flyway aplica la cadena completa sobre una base vacia

- **Descripcion:** la base del contenedor arranca vacia y el contexto la migra.
- **Resultado esperado:** al menos 75 migraciones aplicadas con exito.

### INFRA-02 — Un token valido autentica de verdad

- **Request:** `GET /api/me` con un token generado por los fixtures.
- **Resultado esperado:** 200 con `X-Request-Id` en las cabeceras.

### INFRA-03 — La base queda limpia entre tests

- **Resultado esperado:** al empezar un test no hay ningun usuario ni ninguna sesion.
