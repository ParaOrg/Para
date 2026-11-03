# Para

Ground-truthed jeepney routes for Metro Manila, on a map anyone can open.

- **The map:** https://www.para-commute.org — on an Android
  phone, Chrome offers to install it as **Para**; it then opens full screen
  and keeps working without a signal, showing the routes it last saw. It is
  `main`, and changes only when a release is merged.
- **Staging:** https://staging-para.para-ph-info.workers.dev — the
  `staging` branch, each piece of work there as soon as its checks pass,
  before it is merged. For looking: its `/studio/` edits the same database
  as the live one, so routes are edited on the live studio only. Every other
  branch gets a link of its own, `https://<branch>-para.para-ph-info.workers.dev`,
  kept out of search engines as staging is.
- **How it is built, and what comes next:** [PLAN.md](PLAN.md). The words the
  app, the plan and the owner use: [CONTEXT.md](CONTEXT.md). Decisions and
  research: [docs/](docs/).
- **Running it:** [docs/operations.md](docs/operations.md) — where each
  service lives, what it costs, what renews when, and what to do when
  something breaks.

## Three pages, one published map

**`/` is the public map.** It never asks the database: it reads the published
map, `public/data/index.v5.json` — every route (loops too) and hotspot, the train lines
and the ferry with their stations, each line as an overview — and a direction's full line from `public/data/lines/` when it is
lit, all published from the live tables and committed here, and draws every direction of every route, the hotspots (terminals and
hintuans, where people board), and where a direction passes a hintuan its
line turns orange for that stretch. A tap on a line or a box opens a card; a
tap where several things meet opens a chooser. On a trip, any hintuan (on a
train, any station) can be the ride's start or its end: Set as start under a
row, a tap for the end, and the Distance and fare tiles read the ride between
them. SWITCH turns the card to the other direction, and names it: Pabalik on
a Papunta card, the other bound on a train. The layers button at the top
right opens the Map Style card: Monochrome, Colour (Apple Maps' light
palette) or Fiord. Each route's row on a card ends with its vehicle, and
the map's credits start folded to their ⓘ; a tap opens them. "Where am I"
shows the commuter as a blue dot with a heading cone, in a circle the size of
the fix's accuracy; the position never leaves the phone. It installs
as an app and keeps the last map it saw, so it works offline.

**`/studio/` is the editor**, for the owner and the accounts on the editor
list. It reads the live tables, draws lines snapped to the road with OSRM,
traces hotspot boxes, and saves. The database's row-level security refuses
every write from anyone else, so the publishable key in `.env.production`
is public by design.

**`/contribute/` is the contributor page.** There a commuter records a
contribution on the phone, from Start to Save, and sends it to the studio,
where only editors see it. It is a page of its own, so the public map carries
none of it, and the contributor app is the same page inside an Android shell.

Nothing from `src/app/studio/` or `src/features/studio/` reaches the public page: `npm run lint`
checks the import boundaries (`eslint.config.js`) and `npm run build` the built page, and each
fails if the editor or the database's address ever gets in.

## Running it

    npm install
    npm run dev                     # http://localhost:5173 and /studio/
    npm run dev:phone               # the same, and on the home Wi-Fi too

`dev:phone` lets a phone on the same Wi-Fi open the dev server at
`http://<this computer's address>:5173` and see each edit as it is saved.
Only on a network you trust: it answers anyone on it. Over plain http a
phone's browser refuses its position and the offline app, so "Where am I"
and installing are tried on staging instead.

The editor needs the project's address and publishable key in `.env.local`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`); the public map needs
nothing. `/studio/?e2e=1` skips the sign-in door in development builds, for
the headless checks — drawing works, saving still needs an account.

    npm run check                   # Prettier's check, ESLint, the architecture page's check, the build with its guards, then the unit checks
    npm run format                  # Prettier over the tree (.prettierrc); blame skips the format commit
                                    # once per clone: git config blame.ignoreRevsFile .git-blame-ignore-revs
    node tests/e2e/commuter-test.mjs # and the other headless suites, see tests/e2e/README.md
    npm run check:data              # the committed map against the app's own rules
    npm run storybook               # the cards, the chooser, the panels, on their own

If the architecture page's check fails, run `npm run docs:architecture` and
commit the updated `docs/architecture.md`.

**CI runs on GitHub** (`.github/workflows/ci.yml`): the build, the unit
checks, and the headless suites against the dev server, each suite its own
job. A pull request runs only the suites its files can reach (docs alone run
none), and the drawing suites, which lean on the public OSRM router, run only
on pushes to `main` and `staging`, nightly and on "Run workflow". A red check
means the change broke something; the failing suite's screenshots are the
run's artifact. Details in `tests/e2e/README.md`.

## Publishing the map

The map is published from `main`, every night at 04:00 Manila and on "Run
workflow" (`.github/workflows/publish-map.yml`). `scripts/publish/publish-map.mjs`
reads the public tables, keeps each line within half a metre of what was
drawn and rounds to 6 decimals — the app's own rules, imported from `src/`
— refuses a map that suddenly shrank, and writes the same bytes for the
same data, so a quiet night commits nothing.
`scripts/checks/check-map-data.mjs` then reads it back against the app's own
rules: a link to a hotspot that is not there stops the publish; a line that
ends far from its terminal, or a hintuan it passes without being linked to,
goes out with the map and is written up. One issue, **"The map needs a
look"**, is opened or brought up to date by a run that failed or published
with warnings, and closed by the first run with nothing to report.

## Map tiles

Para is building its own map tiles so the map no longer depends on
OpenFreeMap (`.scratch/own-tiles/spec.md`). `.github/workflows/tiles.yml`
builds them on the 3rd of each month at 02:00 Manila, on "Run workflow" (tick
**upload**) and on a push to `staging` that changes the workflow or
`scripts/tiles/`. It uploads to R2 only from `staging` or `main`, and says so
and stops on any other branch. GitHub runs a schedule only from `main`, and
shows "Run workflow" only for a workflow file on `main`, so until the owner
releases to main the push to `staging` is what starts an upload: merging the
tiles pull request does the first one once the four secrets exist (without
them it stops at once, naming the missing secret). It reads the box the public
map can be panned across (`METRO_MANILA` in `map-view.tsx`) and fails if a
published route falls outside it. Planetiler's OpenMapTiles profile builds
zooms 0 to 14 from Geofabrik's Philippines extract (about 66 MB, four
minutes); Planetiler and the extract are checked against their checksums.
Planetiler's own downloads (water polygons, Natural Earth, lake centerlines)
are copied to `build-cache/sources/` in R2: an upload run takes them from
there, falls back to upstream for what is missing and refreshes the copy
(delete `build-cache/` to refresh from upstream). Before anything is
uploaded the file must be at least 40 MB, hold at least 90% of the last
build's tiles and the SM Fairview, Quiapo and BGC tiles at zoom 14, and carry
its build date in its metadata. A pull request builds and checks but never
uploads and never sees the R2 secrets. A failed run is red, and GitHub emails the owner about a failed
scheduled run, as for the backup.

R2 gets `tiles/parapo-YYYY-MM-DD-<run id>.pmtiles` (never overwritten: an upload refuses a name that exists; the last three kept, older ones deleted only after `current.json` has moved), then
`tiles/current.json` (`file`, `builtAt`, `bytes`, `tiles`, `extractDate`,
`planetiler`) last, so a failed upload never points at a half file. Under
`assets/` go OpenFreeMap's three styles as they are (`styles/`), the sprite
(`sprites/`) and the glyphs of Noto Sans Regular, Bold and Italic (`fonts/`),
so the map can stop fetching from `tiles.openfreemap.org`; pointing the styles
at our host is the Worker's job, and `VITE_BASEMAP_HOST` points the app at it
(ADR 0007). The four secrets, `TILES_R2_ENDPOINT`,
`TILES_R2_ACCESS_KEY_ID`, `TILES_R2_SECRET_ACCESS_KEY` and `TILES_R2_BUCKET`,
live in a GitHub Environment named `tiles` whose deployment branches are
limited to `staging` and `main`, so GitHub itself keeps the keys from any other
branch, and only the steps that talk to R2 carry them. Pruning never deletes
the file the previous `current.json` named, so a run that failed after its
upload cannot take down the file being served.

Licences to keep with the copies: the styles' code is BSD-3-Clause and their
design CC BY 4.0 (Positron and Fiord derive from CartoDB Basemaps, CC BY 3.0;
Fiord's own repository, `openmaptiles/fiord-color-gl-style`, says the same:
BSD-3-Clause code, CC BY 4.0 design, no attribution needed on the map image
but reasonably reachable); the sprite's Maki icons are CC0; the fonts are SIL
OFL 1.1. The map keeps "© OpenMapTiles" and "© OpenStreetMap contributors".

## Where things are

| | |
| --- | --- |
| `src/app/` | the three front doors, wiring only: `public-map/` (the public map's entry, its shell and status bar), `studio/` (the editor's entry and shell) and `contribute/` (the contributor page's entry, its shell and its service worker) |
| `src/features/routes/` | the core both apps draw: `model/` (routes, stops, places, timelines, rides, fares, liveries — no React, no MapLibre), `geo/` (the pass and babaan-side rules), `map/` (the map view with its basemap and layers, the route and hotspot layers and hooks, and the map side of the cards: `use-card-stack`, which card is up, and `use-card-camera`, the camera with them), `cards/` (the cards, sheets and timelines, with their stories), `published/` (the published map's reader: `fetch-index.ts` and `fetch-line.ts`, its shape in `index-schema.ts` and `line-file-schema.ts`, its names and URLs in `map-file.ts`). Imported through its concern folders; it has no `index.ts` on purpose, since Node runs the publish and the unit checks against its files |
| `src/features/locator/` | "Where am I": the commuter's dot, its button and its moods |
| `src/features/published-map/` | the published map's freshness, the installed app's updates (`pwa.ts`) and the notices |
| `src/features/studio/` | the editor: `auth/` (sign-in, passwords, the session), `data/` (the Supabase client, reads and writes), `drawing/` (drawing, snapping, borrowing), `panels/` (save, hotspot, the card's actions). Its `index.ts`, like the locator's and the published map's, is what the shells import |
| `src/features/contribute/` | the contributor page, where a contribution is recorded on the phone, saved and sent, with the consent, the recorder, the contributor's account and the uploads. Its `index.ts` is what the contributor page's shell imports, and the public page never loads it |
| `src/shared/` | what knows no feature: `ui/` (the bottom sheet, its gesture, the icons), `hooks/` (dialog focus, escape, a child's turn), `utils/` (coordinate maths), `lib/` (the TanStack Query client), `config/` (the basemap host) and `types/` (the database types Supabase generates) |
| `src/styles/` | `global.css`, the one stylesheet: Tailwind, then the design system's tokens and fonts |
| `src/design-system/` | the tokens, fonts and primitives (foundation ← primitives) |
| `public/data/` | the published map, every version kept in history: `index.v5.json` (what the app reads), a line per direction in `lines/` (with its orange stretches, worked out as it is published), and for apps not yet updated `index.v4.json` (without loops), `index.v3.json` (without the ferry either), `index.json` and the older single file `map.json` (without any line) |
| `supabase/migrations/` | the schema and its policies, in order |
| `scripts/` | tools: the build guards and the data check (`checks/`), the publish (`publish/`), Node's TypeScript hook (`node/`), the monthly map-tiles build (`tiles/`), the research screenshots and the cheap-phone timer, `phone-speed.mjs` with its parts, and the load test of the map and its tiles, `load-test.mjs`, run by hand only (`research/`), the icons' lossless PNG recompressor, `recompress-png.mjs` (`assets/`) |
| `tests/unit/` | the unit checks, Node's own test runner (`npm run test:unit`) |
| `tests/e2e/` | the headless suites, and their README |

## Contributing

New here? Start with [CONTRIBUTING.md](CONTRIBUTING.md): how to run Para on
your computer, the standards, and how to send a pull request (into `staging`,
not `main`). Small, ready-made tasks are the issues labelled
[good first issue](https://github.com/ParaOrg/Para/labels/good%20first%20issue).
A jeepney route that is wrong or missing? Open a
[route report](https://github.com/ParaOrg/Para/issues/new/choose); you do
not need to write code.

## Data and licence

**The code** is under the [MIT licence](LICENSE): use it for anything, keep
the copyright notice.

**The route and hotspot data** — `public/data/`, and the database it
is published from — is under the
[Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/)
(ODbL). You may copy, use and adapt it, including commercially, as long as
you:

1. **Credit it:** "Route data © Para contributors, ODbL", and OpenStreetMap
   for the roads it follows.
2. **Share alike:** if you publish an adapted version of the data, publish it
   under the ODbL too.
3. **Keep it open:** do not wrap it in technical restrictions that stop
   others doing the same.

The route lines follow OpenStreetMap's road network (snapped with OSRM), so
the data is a derivative of OpenStreetMap, © OpenStreetMap contributors, also
under the ODbL. The map tiles are built from the same data: by Para itself on
staging (`workers/tiles`, ADR 0007), by OpenFreeMap on `main` until staging is released.

Every published version of the map is kept in this repository's history,
so what is published stays public.
