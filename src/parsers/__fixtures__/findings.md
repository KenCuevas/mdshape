# Hallazgos de la revision

Resumen de los problemas encontrados durante la revision de QA.

Los identificadores enlazan con la seccion correspondiente.

| Id | Severidad | Area | Titulo |
| --- | --- | --- | --- |
| [SEC-01](#sec-01) | Critica | auth | verify-otp entrega tokens sin validar el codigo |
| [BUG-06](#bug-06) | Media | publicaciones | El listado publico ignora el filtro de estado |
| [SEC-02](#sec-02) | Alta | auth | Refresh token reutilizable tras logout |

---

## SEC-01

**Severidad:** critica

El endpoint `POST /api/auth/verify-otp` devuelve tokens aunque el codigo sea invalido.

Evidencia: `OTP-S01` y OTP-S02.

```http
POST /api/auth/verify-otp
{ "code": "000000" }
```

| Paso | Resultado |
| --- | --- |
| 1 | 200 con tokens |

## BUG-06

Ver PUB-S03 en el tablero.

## SEC-02

Prosa del hallazgo. Escenarios: REFRESH-N03.

## Observaciones menores

- Mensajes de error inconsistentes.
- Falta `Cache-Control` en respuestas privadas.
