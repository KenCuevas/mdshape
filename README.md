# mdshape — QA Docs Explorer

A local web app to browse the QA review documentation of a project: epics, test scenarios,
findings and the long-form documents (README, test strategy, coverage matrix). Everything is
parsed from the original Markdown files at build time. The documentation is read-only;
your tracking state (status, priority, notes on scenarios) lives in your browser's local
storage. There is no backend, no database, no authentication and nothing meant to be
published on the internet.

Built with Vue 3 (`<script setup>` + strict TypeScript), Vite, Vue Router (history mode),
markdown-it with highlight.js, DOMPurify, Vitest, ESLint and Prettier. The UI is plain CSS
with design tokens; no UI framework.

## Requirements

- Node.js 22.12 or newer (the project is developed with Node 22).
- npm 10 or newer.

## Installation and usage

```bash
npm install

# 1. Put the documentation folder next to package.json:
#    ./reviews/
#      ├── README.md
#      ├── test-strategy.md
#      ├── coverage-matrix.md
#      ├── findings.md
#      └── epics/*.md
# 2. Copy it into the app (repeat whenever the docs change):
npm run sync:docs

# 3. Start the dev server and open the printed URL:
npm run dev
```

`sync:docs` copies `./reviews` to `src/content/reviews/` (only `.md` files, the target is
wiped first). A different source folder can be given as an argument or through the
`DOCS_SOURCE` environment variable:

```bash
npm run sync:docs -- ../some/other/reviews
DOCS_SOURCE=/abs/path/reviews npm run sync:docs
```

The source files are never modified. Because the Markdown is inlined into the bundle with
`import.meta.glob(..., { query: '?raw', eager: true })`, the dev server picks up changes
made under `src/content/reviews/` automatically, but files added to `./reviews` need a new
`npm run sync:docs`.

Until the documentation is synced, the app shows an empty state on every view and logs a
warning in the browser console.

## Scripts

| Script                 | What it does                                                             |
| ---------------------- | ------------------------------------------------------------------------ |
| `npm run dev`          | Vite dev server with hot reload.                                         |
| `npm run build`        | Type-checks (`vue-tsc --build`) and builds to `dist/` with `base: './'`. |
| `npm run preview`      | Serves `dist/` locally (history-mode routes reload correctly).           |
| `npm run test`         | Runs the Vitest suite once (parser and renderer tests).                  |
| `npm run test:watch`   | Vitest in watch mode.                                                    |
| `npm run type-check`   | `vue-tsc --build` without building.                                      |
| `npm run lint`         | ESLint with zero warnings allowed.                                       |
| `npm run lint:fix`     | ESLint with autofix.                                                     |
| `npm run format`       | Prettier over the whole project.                                         |
| `npm run format:check` | Prettier in check mode.                                                  |
| `npm run sync:docs`    | Copies `./reviews` (or the given path) into `src/content/reviews/`.      |

## Views

- **Home** (`/`): counters computed from the parsed data (epics, scenarios per type,
  findings per severity, scenarios that document a finding). Each number links to its view.
- **Board** (`/board`): task tracker with four status columns (Por probar / En curso / Falla / Pasa)
  and card count per column. Each scenario carries an optional priority and free-text note,
  edited from the side panel or dragged between columns. Search (id, title and body),
  multi-select epic filter, "only findings" switch, type filter across all columns,
  result counter and "clear filters". Filters live in the URL query (`q`, `epic`, `findings`,
  `type`, `s`) so a board state can be shared as a link. Clicking a card opens a side panel
  with the whole scenario; `Escape` closes it and returns focus to the card. `?s=<ID>` opens
  a scenario directly. On narrow screens the columns become a column selector instead of
  horizontal scrolling.
- **Epics** (`/epics`, `/epics/:slug`): header with the introduction, metadata, endpoints
  and contract tables, then the scenarios grouped by type with the same card component.
- **Findings** (`/findings`, `/findings/:id`): grid sorted by severity, with severity badge
  and area chip. The detail view renders the whole body and lists the scenarios that
  evidence the finding; scenario identifiers inside the Markdown become links to the board.
- **Documents** (`/docs/:slug`): reading-width layout, sticky table of contents generated
  from the headings with scroll-spy highlight, tables with their own horizontal scroll and
  code blocks with syntax highlighting and a copy button.

Light and dark themes follow `prefers-color-scheme`; the manual toggle in the sidebar is
remembered in `localStorage` (`mdshape.theme`).

### Personal tracking (board state)

The board doubles as a personal task tracker. Each scenario carries a status
(Por probar / En curso / Falla / Pasa), an optional priority and a free-text
note. Cards are dragged between columns with the mouse; on touch screens and
with the keyboard the same change is made from the side panel.

This state is **yours, not the documentation's**: it lives in `localStorage`
under `mdshape.board` and is never written back to the Markdown. Use _Exportar
progreso_ / _Importar_ in the board toolbar to back it up or move it to another
machine; importing merges by `updatedAt`, keeping the most recent entry of each
scenario, so it never destroys work.

Entries whose scenario no longer exists in the Markdown are kept, not deleted:
a renamed or temporarily unparsable file never loses your notes.

## Project structure

```text
scripts/sync-docs.mjs        copies ./reviews into src/content/reviews
src/
├── content/reviews/         synced Markdown (input data; never edited by the app)
├── data/
│   ├── content.ts           the only import.meta.glob call
│   └── labels.ts            UI labels for types and severities
├── types/                   Scenario, Epic, Finding, DocPage, Catalog (no `any`)
├── parsers/                 pure functions: markdown text -> typed objects
│   ├── common.ts            id patterns, heading/table helpers, severity normalisation
│   ├── epic.ts              epics/*.md -> Epic + Scenario[]
│   ├── findings.ts          findings.md -> FindingsDoc
│   ├── doc.ts               any file -> DocPage (title, body, headings)
│   ├── catalog.ts           classifies files, builds the Catalog and its stats
│   ├── __fixtures__/        Markdown samples used only by the tests
│   └── __tests__/           Vitest specs
├── board/                   pure board-state logic (status, priority, notes)
├── markdown/                markdown-it renderer, highlight.js setup, sanitising
├── composables/             useCatalog (parse once), useTheme, useBoardFilters, ...
├── components/              small single-purpose components (layout, board, scenario, ...)
├── views/                   one component per route
├── router/                  named routes, history mode
└── styles/                  tokens.css (all colours), base.css, markdown.css
```

Parsing happens once, lazily, the first time `useCatalog()` is called; views never parse
again.

## The Markdown contract (what the parser expects)

### Epics (`epics/*.md`)

- The file must start with a level-1 heading `# Epica: <name>` (accents are ignored). The
  route slug is the file name. **That heading is what makes a file an epic**: the parser
  accepts them under `epics/` and directly at the root of `reviews/` alike, so the layout
  of the folder does not matter.
- Everything between the title and the first `##` section or the first scenario is the
  header. Paragraphs before any metadata or table are the introduction. Bold lines with a
  value (`**Endpoint:** ...`, `**Implementacion:** ...`, `**Tests:** ...`, any label) are
  metadata. A bold or `###` title without a value names the block that follows; the block
  titled `Endpoints` becomes the endpoints table, every other titled block (contract
  tables, notes) is kept verbatim. `---` separators are ignored.
- A scenario is a `###` heading of the form `<IDS> — <title>` (em dash, en dash or hyphen
  surrounded by spaces). `<IDS>` can list several identifiers (`RESEND-P01 / OTP-N05`,
  `OTP-N01 y OTP-N02`): one scenario card is produced per identifier, sharing the content.
- An identifier matches `<PREFIX>-<LETTER><NUMBER>` where the prefix is one or more
  upper-case segments joined by hyphens (`LOGIN`, `LOGOUT-ALL`). **The scenario type is
  derived from the letter** (`P` positive, `N` negative, `S` security, `E` error), never
  from the `## Pruebas ...` section, so files without sections (e.g. `infra.md`) work.
- The letter may be missing (`INFRA-01`); those scenarios go to the positive column. That
  shape is also the shape of a finding id, so it is only read as a scenario inside the
  `###` heading of an epic, where nothing else can be meant. `parseScenarioHeading` keeps
  rejecting it unless the caller passes `allowUntypedIds`.
- A title may start with a finding marker `(HALLAZGO SEC-01, critico)`; the id and the
  optional severity are extracted and the marker is removed from the title. A
  `- **Hallazgo:** SEC-01` bullet is accepted as a fallback.
- The body is a list of `- **Label:** content` bullets. Labels are an open set
  (`Resultado esperado (hoy)`, `Resultado correcto`, `Nota`, `Impacto`, `Por que
importa`...). Continuation lines, nested lists and fenced code inside a bullet stay with
  it; content that is not a bullet is kept as an unlabelled Markdown block.
- A file that announces itself as an epic (or sits under `epics/`) but does not fit (no
  scenario headings) never throws: it is shown as a plain document, listed under "Sin formato de épica" in
  the sidebar, and a warning is logged in the console and shown on the home page.

### Findings (`findings.md`)

- Level-1 title, introduction prose and a summary table with `Id / Severidad / Area /
Titulo` columns (matched by header name, ids may be links).
- One `## <ID>` section per finding (`SEC-01`, `BUG-06`, ...). Severity, area and title
  come from the summary table, with `**Severidad:** ...` style lines in the body as a
  fallback. The full body is kept as Markdown; scenario identifiers mentioned in it are
  collected and become links.
- Sections without an id (e.g. `## Observaciones menores`) are rendered after the list.

### Other documents

Any other `.md` file is a document page: the first `#` heading is the title, the rest is
rendered whole, and the `##`/`###` headings feed the table of contents.

## Where to change things if the Markdown format changes

| Change in the docs                                  | Where to look                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| Identifier pattern or new type letters              | `src/parsers/common.ts` (`SCENARIO_ID_RE`) and `src/types/scenario.ts` |
| Scenario heading shape or finding marker            | `parseScenarioHeading` in `src/parsers/epic.ts`                        |
| Bullet / label format inside a scenario             | `parseDetails` in `src/parsers/epic.ts`                                |
| Epic header (intro, metadata, endpoints, contracts) | `parseHeader` in `src/parsers/epic.ts`                                 |
| Findings table columns or section headings          | `src/parsers/findings.ts`                                              |
| Which files are epics / findings / documents        | `buildCatalog` and `looksLikeEpic` in `src/parsers/catalog.ts`         |
| Severity words                                      | `normalizeSeverity` in `src/parsers/common.ts`                         |
| Colours per type / severity                         | `src/styles/tokens.css`                                                |
| Board statuses, priorities or their colours         | `src/types/board.ts`, `src/data/labels.ts`, `src/styles/tokens.css`    |
| UI labels                                           | `src/data/labels.ts`                                                   |

Add a fixture under `src/parsers/__fixtures__/` and a test under
`src/parsers/__tests__/` for every new variant; the parser is the fragile part and the
tests are what keep it honest.

## Design decisions worth knowing

- **Type from the identifier letter, not from the section.** The section name is stored
  as `section` for display only.
- **Duplicate identifiers** across files keep the first occurrence and log a warning.
- **HTML from Markdown is sanitised** with DOMPurify before it is injected with `v-html`.
  External links open in a new tab; scenario and finding identifiers found in any rendered
  Markdown are turned into in-app links when they exist in the catalog.
- **Relative `base: './'` and history mode.** Vite is configured with `base: './'` as
  required, and the router uses `/` as its history base (dev and preview both serve from
  the root). A small preview-only middleware in `vite.config.ts` maps asset requests from
  nested routes (`/epics/assets/...`) back to `/assets/...` so reloading any route works
  in `npm run preview`. If you ever serve `dist/` from a sub-path with another static
  server, that server needs the same SPA fallback and the router base must match.
- **No Pinia.** The catalog is immutable after startup, so a module-level singleton
  exposed by `useCatalog()` is enough.

## Tests

`npm run test` runs the parser suite (heading variants, double identifiers, finding
markers, non-standard bullets, files without type sections, endpoints-table variant,
findings extraction, unparsable files) plus the renderer tests (sanitising, heading ids,
table wrappers, highlighting, identifier links).
