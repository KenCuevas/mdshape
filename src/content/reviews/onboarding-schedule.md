# Epica: onboarding-schedule

Configuracion del negocio: alta de la empresa, ubicacion, servicios, horarios y el enlace
publico con el que los clientes reservan. Sin esto, el enlace publico no funciona.

**Endpoints** (todos con `@PreAuthorize("hasRole('OWNER')")`)

| Metodo | Ruta |
| :--- | :--- |
| POST | `/api/onboarding/company`, `/location`, `/categories`, `/work-hours` |
| GET | `/api/onboarding/categories`, `/api/company` |
| GET/POST/PATCH/PUT | `/api/schedules` |
| GET/POST/PUT/DELETE | `/api/schedule-overrides` |
| GET | `/api/shared-links` |
| POST | `/api/shared-links/rotate`, `/deactivate`, `/activate` |

**Tests:** `reviews/company/OnboardingAndScheduleApiTest` — 11 escenarios

**Notas del contrato**

- Los dias de la semana se aceptan como numero (0-6), nombre en ingles (`MON`, `monday`) o en
  espanol (`lunes`). Un valor desconocido se rechaza.
- La descripcion de un servicio pasa por `@SafeText`, que prohibe `<` y `>`.
- El enlace publico se crea solo la primera vez que se consulta.

---

## Pruebas positivas

### ONB-P01 — Alta completa del negocio

- **Precondiciones:** profesional verificado sin onboarding completado.
- **Request:** empresa, servicios y horarios, en ese orden.
- **Resultado esperado:** 200 en cada paso con su mensaje (`"Empresa guardada"`, `"Categorias
  guardadas"`, `"Horarios guardados"`), un servicio activo y un dia de horario en base de
  datos, y `GET /api/company` devolviendo el nombre.
- **Nota:** el paso de ubicacion se cubre aparte porque hoy falla siempre (**ONB-E01**).

### SCHED-P01 — Guardar horarios

- **Request:** un bloque con `weekDays: ["MON","TUE","WED"]` de 09:00 a 18:00.
- **Resultado esperado:** respuesta correcta y **tres** filas, una por dia; el listado los
  devuelve.

### SCHED-P02 — Descansos

- **Request:** un dia con una pausa de 13:00 a 14:00.
- **Resultado esperado:** la pausa queda asociada a la fila del dia correspondiente.

### LINK-P01 — Ciclo de vida del enlace publico

- **Request:** consultar, rotar, desactivar y reactivar.
- **Resultado esperado:** la consulta crea el enlace con su slug; la rotacion devuelve uno
  distinto; la desactivacion deja `active: false` y ningun enlace activo; la reactivacion lo
  devuelve a `active: true`.

## Pruebas negativas

### ONB-N01 — Validaciones de cada paso

- **Request:** nombre de empresa vacio; servicio sin duracion; latitud 120.
- **Resultado esperado:** 400 en los tres, con `details` apuntando a `name`, a la duracion del
  servicio y a `latitude`.

### SCHED-N01 — Horarios invalidos

- **Request:** lista vacia, dia sin hora de inicio y un nombre de dia inventado.
- **Resultado esperado:** 400 con `details[0].field = "schedules"` en el primero, 400 en el
  segundo, y rechazo sin filtrar detalles en el tercero.

## Pruebas de seguridad

### ONB-S01 — Marcado en la descripcion de un servicio

- **Request:** descripcion con `<script>alert(1)</script>`.
- **Resultado esperado:** 400 con `"La descripcion de la categoria no puede contener los
  caracteres < o >"` y ningun servicio creado.

### SCHED-S01 — Sin empresa no hay horarios

- **Resultado esperado:** error de cliente y ninguna fila creada: los horarios cuelgan de la
  empresa.

### LINK-S01 — Rotar invalida el enlace anterior

- **Request:** rotar y despues abrir sesion publica con el slug viejo.
- **Resultado esperado:** 404. Es la forma de cortar el acceso cuando un enlace se ha
  difundido de mas.

### ONB-S02 — La configuracion exige rol de profesional

- **Resultado esperado:** 403 sin cabecera en el alta de empresa, en los horarios y en el
  enlace compartido; ninguna empresa creada.

## Pruebas de error

### ONB-E01 — (HALLAZGO BUG-06, critico) Guardar la ubicacion falla siempre

- **Request:** `POST /api/onboarding/location` con calle, numero, provincia, municipio y
  sector.
- **Resultado esperado (hoy):** 500 y ninguna fila en `company_locations`. La columna `city`
  sigue siendo obligatoria en el esquema y el `INSERT` ya no la escribe.
- **Resultado correcto:** 200 con la ubicacion guardada.
- **Impacto:** ningun profesional puede completar el paso de direccion del alta.
