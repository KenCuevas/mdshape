# Tablero de estados tipo Jira — diseño

Fecha: 2026-09-04
Estado: aprobado en conversación, pendiente de plan de implementación

## Contexto y objetivo

mdshape es hoy un visor de solo lectura: el catálogo se construye en tiempo de
compilación desde el markdown de `reviews/` y nada de lo que hace el usuario se
guarda. El tablero (`/board`) muestra cuatro columnas fijas por **tipo** de
escenario (Positivo / Negativo / Seguridad / Error), derivado de la letra del
identificador.

El objetivo es usar ese tablero como un gestor de tareas personal —"mi Jira sin
suscripciones"— para llevar el seguimiento de las 189 pruebas: qué has probado ya,
qué está fallando y qué te queda.

Esto convierte una aplicación inmutable en una con estado mutable y persistente.
Es el cambio de fondo del diseño y todo lo demás se deriva de él.

## Decisiones tomadas

| Decisión          | Elección                                       | Por qué                                                                                      |
| ----------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Alcance           | Estados reales + arrastrar, no solo apariencia | Es lo que convierte el visor en un gestor de trabajo                                         |
| Columnas          | Por probar / En curso / Falla / Pasa           | Pensadas para QA: separan "no probado" de "probado y roto"; mismo número de columnas que hoy |
| Persistencia      | `localStorage` + exportar/importar JSON        | Sin backend, y con copia de seguridad y portabilidad entre equipos                           |
| Datos por tarjeta | Estado + nota + prioridad                      | La nota hace accionable la columna "Falla"; la prioridad ordena dentro de cada columna       |
| Arrastre          | API nativa de HTML5                            | Cero dependencias nuevas; el táctil y el teclado se cubren con el selector del panel         |

## Modelo de datos

Fichero nuevo `src/types/board.ts`, separado del catálogo porque son cosas de
naturaleza distinta: el catálogo es inmutable y viene del markdown; esto es del
usuario y cambia.

```ts
export type BoardStatus = 'todo' | 'doing' | 'fail' | 'pass'
export const BOARD_STATUSES: readonly BoardStatus[] = ['todo', 'doing', 'fail', 'pass']

export type Priority = 'high' | 'medium' | 'low'
export const PRIORITIES: readonly Priority[] = ['high', 'medium', 'low']

export interface BoardEntry {
  status: BoardStatus
  priority: Priority | null
  note: string
  updatedAt: string // ISO 8601
}

export interface BoardStateFile {
  version: 1
  updatedAt: string
  entries: Record<string, BoardEntry> // clave = id del escenario, p. ej. LOGIN-P01
}
```

Valores por defecto de un escenario sin entrada: `status: 'todo'`,
`priority: null`, `note: ''`.

## Almacén: `src/board/` + `useBoardState()`

La lógica se separa en dos capas, siguiendo el patrón que ya usan `parsers/` y
`markdown/`: un módulo autocontenido con funciones puras y su propio `__tests__`, y
encima una capa fina de Vue.

- **`src/board/boardState.ts` (puro, sin Vue).** Valores por defecto, validación y
  normalización de un `BoardStateFile`, `mergeStates(a, b)` por `updatedAt`, y las
  funciones que aplican un cambio a un mapa de entradas. Todo son funciones de
  entrada/salida, así que la fusión, la validación y la regla de borrado se prueban
  sin montar nada.
- **`src/board/boardGrouping.ts` (puro, sin Vue).** `groupByStatus(scenarios, entries)`
  y el orden por prioridad.
- **`src/composables/useBoardState.ts` (capa Vue).** Mismo patrón que `useCatalog()`
  y `useTheme()`: singleton a nivel de módulo, lectura perezosa en el primer uso, sin
  Pinia (decisión ya documentada en el README). Aporta la reactividad y el acceso a
  `localStorage`; toda la lógica la delega en `boardState.ts`.

Esta separación es lo que hace que el almacén sea comprobable de verdad: lo único
que queda sin cubrir por funciones puras es leer y escribir en `localStorage`.

API del composable:

- `getEntry(id): BoardEntry` — devuelve la entrada por defecto si no existe.
- `setStatus(id, status)`, `setPriority(id, priority)`, `setNote(id, note)` — cada
  una actualiza `updatedAt` y persiste.
- `exportState(): BoardStateFile`
- `importState(raw: unknown): { ok: true; merged: number } | { ok: false; error: string }`

Reglas de persistencia:

1. **Clave** `mdshape.board`, coherente con `mdshape.theme`.
2. **Solo se guarda lo que se toca.** Un escenario sin entrada _es_ "Por probar";
   no se escribe nada hasta que se modifica. Consecuencia buscada: tras un
   `npm run sync:docs`, los escenarios nuevos aparecen solos en "Por probar" sin
   necesidad de migrar nada.
3. **Una entrada que vuelve a todos sus valores por defecto se elimina** (estado
   `todo`, sin prioridad y sin nota). Mantiene el almacén y el export limpios.
4. **Las entradas huérfanas no se borran nunca.** Si un escenario desaparece del
   markdown (renombrado, o un fallo del parser), su estado y su nota siguen
   guardados aunque no se pinten, y reaparecen si el id vuelve. Borrarlas sería
   destruir trabajo del usuario por un cambio en un fichero que no controla.
5. **Toda escritura va envuelta en `try/catch`**, igual que `useTheme`: si
   `localStorage` no está disponible, la sesión funciona en memoria y no falla.

El catálogo no se toca ni se muta. La unión `Scenario + BoardEntry` ocurre al
pintar, de modo que épicas, hallazgos, búsqueda y enlaces siguen funcionando igual.

## El tablero

**Las columnas pasan a ser el estado.** El tipo no desaparece: sigue en el borde
izquierdo de color de la tarjeta (clases `type-*`, ya existentes) y en el filtro por
tipo de la barra, que ya está implementado en `useBoardFilters` bajo la clave `type`
de la URL. Antes ese filtro seleccionaba una columna; ahora filtra las cuatro a la
vez, que es más útil.

**Orden dentro de la columna:** por prioridad (alta → media → baja → sin prioridad)
y, a igualdad, el orden del catálogo, que ya viene agrupado por épica e id. Por
tanto **arrastrar dentro de una misma columna no hace nada**: se arrastra entre
columnas para cambiar el estado, y el orden lo decide la prioridad. Un orden manual
posición a posición exigiría guardar y reindexar un índice por tarjeta; queda fuera
de alcance.

**Filtros y URL:** sin claves nuevas. Se mantienen `q`, `epic`, `findings`, `type` y
`s`. El estado de las tarjetas no es un filtro compartible por enlace porque es
local del usuario, no del documento.

**Contadores por columna:** número de tarjetas visibles tras aplicar los filtros,
igual que hoy.

**Móvil:** `ColumnPicker` pasa a elegir entre las cuatro columnas de estado.

### Arrastre (API nativa)

- La tarjeta lleva `draggable="true"` y en `dragstart` escribe su id en
  `dataTransfer`.
- La columna es zona de destino: `dragover.prevent` y, en `drop`, llama a
  `setStatus(id, status)`.
- Feedback visual: la tarjeta arrastrada baja de opacidad; la columna bajo el cursor
  se resalta.
- `dragenter`/`dragleave` disparan también con los elementos hijos, así que el
  resaltado se lleva con un **contador de profundidad**, no con un booleano. Es el
  fallo clásico de esta API y provoca parpadeo si se ignora.
- La tarjeta sigue siendo un `<button>`: el clic para abrir el panel y el foco por
  teclado se mantienen intactos; `draggable` solo se añade encima.
- El arrastre nativo **no funciona con el dedo**. Es una limitación aceptada: el
  cambio de estado desde el panel lateral cubre táctil y teclado.

## Panel lateral

Bloque "Mi seguimiento" al principio del panel, antes del contenido del escenario:
estado (cuatro botones), prioridad (`select`) y nota (`textarea`).

El panel ya tiene trampa de foco sobre `a, button, input, select, textarea`, así que
los controles nuevos entran en el ciclo de Tab sin cambiar nada. Este bloque **es**
la vía accesible y táctil para cambiar de columna sin arrastrar.

El panel cierra con `Escape`. Para que eso nunca pierda texto, la nota se guarda
mientras se escribe con un retardo de 400 ms y también al perder el foco.

## Exportar / importar

Dos botones en `BoardToolbar`.

- **Exportar**: arma el `BoardStateFile`, lo serializa y lo descarga como
  `mdshape-progreso-AAAA-MM-DD.json` mediante Blob y un enlace con `download`.
- **Importar**: `input type="file"` con `accept="application/json"`, valida
  `version` y la forma de cada entrada, y **fusiona quedándose con la entrada de
  `updatedAt` más reciente** de cada escenario.

Se fusiona en vez de sustituir porque cubre los dos casos sin destruir nada:
restaurar sobre un navegador vacío devuelve exactamente la copia, y traer el
progreso de otro equipo conserva lo más nuevo de cada escenario.

Un fichero inválido (JSON ilegible, `version` desconocida, entradas malformadas)
muestra un error visible en la barra. No falla en silencio ni tumba la aplicación.

## Pruebas

La lógica vive en funciones puras en `src/board/`, fuera de los componentes `.vue`,
para poder probarla de verdad; el componente solo pinta. Las pruebas van en
`src/board/__tests__/`, igual que las de `parsers/` y `markdown/`.

Cubierto con Vitest:

- `boardState.ts`: escenario sin entrada devuelve "Por probar"; aplicar un cambio
  produce el mapa esperado con `updatedAt` nuevo; una entrada que vuelve a sus
  valores por defecto se elimina; las entradas huérfanas sobreviven a una fusión.
- Fusión y validación: ida y vuelta de exportar/importar; `mergeStates` gana el más
  nuevo en ambas direcciones; rechazo de `version` desconocida, de JSON ilegible y
  de entradas malformadas.
- `boardGrouping.ts`: reparto por columna y prioridad alta → media → baja → sin
  prioridad, con el orden del catálogo como desempate.
- `useBoardState`: persiste y relee desde `localStorage`, y un `localStorage` que
  lanza excepción no rompe la sesión (se simula igual que se haría con `useTheme`).
- Las 54 pruebas actuales siguen en verde. `ScenarioCard` recibe props **opcionales**
  precisamente para que `EpicView` (que la reutiliza vía `ScenarioGroup`) no cambie.

**No cubierto con pruebas automáticas:** los manejadores de arrastre. Simular
`dragstart`/`drop` en jsdom demuestra que se llama a la propia función, no que el
navegador arrastre; esa parte se verifica ejecutando la aplicación. Lo que sí queda
probado es el efecto de soltar sobre una columna, porque es `setStatus`.

## Ficheros

Nuevos:

- `src/types/board.ts`
- `src/board/boardState.ts`
- `src/board/boardGrouping.ts`
- `src/board/__tests__/boardState.test.ts`
- `src/board/__tests__/boardGrouping.test.ts`
- `src/composables/useBoardState.ts`
- `src/composables/__tests__/useBoardState.test.ts`
- `src/components/scenario/ScenarioTracker.vue`
- `src/data/__tests__/labels.test.ts`

Modificados:

- `src/views/BoardView.vue`
- `src/components/board/BoardColumn.vue`
- `src/components/board/BoardToolbar.vue`
- `src/components/board/ColumnPicker.vue`
- `src/components/scenario/ScenarioCard.vue`
- `src/components/scenario/ScenarioDrawer.vue`
- `src/data/labels.ts`
- `src/styles/tokens.css` (colores en crudo)
- `src/styles/base.css` (clases `.status-*` que los mapean, junto a las `.type-*`)
- `README.md`

## Fuera de alcance

- La vista Inicio y sus contadores. Un "32 de 189 probados" sería un añadido pequeño
  sobre este mismo almacén, pero no entra ahora.
- Orden manual dentro de una columna.
- Arrastre táctil (requeriría Pointer Events, evaluado y descartado).
- Columnas configurables por el usuario.
- Cualquier forma de sincronización o backend.

## Riesgos

- **`localStorage` es por navegador y por origen.** Cambiar de navegador o limpiar
  los datos del sitio pierde el progreso; de ahí que exportar no sea opcional en
  este diseño.
- **El arrastre nativo no funciona con el dedo.** Limitación aceptada y mitigada por
  el selector del panel.
- **Los ids son la clave del estado.** Si el markdown renombra un identificador, su
  seguimiento queda huérfano (conservado, pero invisible) y el id nuevo empieza en
  "Por probar". Es inherente a vincular estado con documentos que no controlamos.
