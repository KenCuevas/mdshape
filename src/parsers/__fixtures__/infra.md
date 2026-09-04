# Epica: infra

Pruebas de infraestructura sin secciones por tipo.

**Implementacion:** `docker-compose.yml`

### INFRA-P01 — El contenedor arranca

- **Descripcion:** `docker compose up` levanta todos los servicios.
- **Resultado esperado:** todos los healthchecks en verde.

### INFRA-N01 — Variable de entorno ausente

- **Descripcion:** falta `DATABASE_URL`.
- **Resultado esperado:** el proceso termina con codigo 1 y un mensaje claro.

### INFRA-S01 — Puertos internos no expuestos

- **Descripcion:** la base de datos no escucha fuera de la red interna.
- **Resultado esperado:** conexion rechazada desde el host.

### INFRA-E01 — Migracion fallida

- **Descripcion:** una migracion invalida.
- **Resultado esperado:** rollback y arranque abortado.
