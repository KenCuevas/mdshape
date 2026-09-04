# Epica: subscription-webhook

El webhook de RevenueCat es el unico camino por el que una empresa gana o pierde el plan Pro.
Es publico y su unica defensa es el secreto que viaja en la cabecera `Authorization`, asi que
merece atencion especial.

**Endpoint:** `POST /api/webhooks/revenuecat` (publico, validado por secreto)
**Implementacion:** `RevenueCatWebhookController` → `SubscriptionService`
**Tests:** `reviews/subscription/SubscriptionWebhookApiTest` — 7 escenarios

**Reglas**

- El secreto se compara con la cabecera `Authorization` completa. Sin `revenuecat.webhook.secret`
  configurado el endpoint **rechaza todo**, y fuera de los perfiles dev/local/test la
  aplicacion ni siquiera arranca.
- La empresa se resuelve por `revenuecat_user_id` y, si no, por el id de usuario del backend
  que viaja en `app_user_id`; al resolverlo por id se guarda el vinculo.
- Los identificadores anonimos (`$RCAnonymousID:...`) se descartan a proposito.
- El plan se deriva del `product_id` con un mapa cerrado
  (`com.agendally.app.pro.monthly`, `.pro.yearly`, `.solo.monthly`, `.solo.yearly`); un
  producto desconocido se resuelve como `none`.
- **Siempre se responde 200** salvo que falle la autenticacion, para que RevenueCat no
  reintente indefinidamente.

---

## Pruebas positivas

### WH-P01 — Compra inicial

- **Precondiciones:** profesional con empresa en plan `none`.
- **Request:** evento `INITIAL_PURCHASE` con `app_user_id` igual al id del usuario,
  `product_id: "com.agendally.app.pro.monthly"`, `expiration_at_ms` y `will_renew: true`, con
  el secreto correcto.
- **Resultado esperado:** 200. La empresa pasa a `plan = 'pro'`, con `will_renew = true` y
  fecha de expiracion.

### WH-P02 — Cancelacion y expiracion

- **Precondiciones:** empresa en `pro` con renovacion activa y `revenuecat_user_id` vinculado.
- **Request:** `CANCELLATION` y despues `EXPIRATION`.
- **Resultado esperado:** la cancelacion deja `will_renew = false` conservando el plan hasta
  el final del periodo; la expiracion retira el plan Pro.

### WH-P03 — Tolerancia a eventos que no se pueden aplicar

- **Request:** usuario inexistente, tipo de evento desconocido, `app_user_id` nulo y cuerpo
  `{}`.
- **Resultado esperado:** 200 en los cuatro casos. Un 4xx o un 5xx haria que RevenueCat
  reintentara sin fin.

### WH-P04 — El resultado es visible para el profesional

- **Request:** compra inicial y despues `GET /api/subscription/status` con el token del
  profesional.
- **Resultado esperado:** `planId: "pro"`. Comprueba de paso que la cache del perfil se
  invalida al aplicar el evento.

## Pruebas de seguridad

### WH-S01 — Secreto ausente o incorrecto

- **Request:** el mismo evento de compra sin cabecera y con un secreto equivocado.
- **Resultado esperado:** 401 en ambos casos y el plan de la empresa sigue en `none`. Es la
  proteccion que impide que cualquiera se conceda Pro.

### WH-S02 — Identificador anonimo

- **Request:** compra con `app_user_id: "$RCAnonymousID:abc123"`.
- **Resultado esperado:** 200 y **ninguna** empresa recibe el plan.

### WH-S03 — La respuesta no filtra informacion

- **Resultado esperado:** el cuerpo esta vacio siempre, tambien cuando el evento se aplica.
  No se confirma si el usuario existe ni que se hizo con el evento.
