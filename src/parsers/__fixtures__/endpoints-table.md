# Epica: sessions

Gestion de sesiones activas.

**Endpoints**

| Metodo | Ruta | Implementacion |
| --- | --- | --- |
| GET | /api/sessions | `sessions.controller.ts` |
| DELETE | /api/sessions/:id | `sessions.controller.ts` |

### Notas del contrato

| Nota | Detalle |
| --- | --- |
| Paginacion | no soportada |

---

## Pruebas positivas

### SESSIONS-P01 — Lista las sesiones del usuario

- **Descripcion:** devuelve la lista.
- **Resultado esperado:** 200.

### LOGOUT-ALL-P01 — Cierra todas las sesiones

- **Descripcion:** prefijo con guion.
- **Resultado esperado:** 204.
