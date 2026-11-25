# 03: Shared code the app can import

Status: needs-info (waits on 02)
Type: task
Who: Opus
Blocked by: 02

## What to build

- One way for the app to import `src/features/routes/model/`, `geo/` and `published/` without copying: the same repository, the app in `native/` with its own `package.json`, and Metro and TypeScript pointed at those folders (or a workspace package, if 02 shows that is simpler). The choice is written as an ADR line.
- `published/fetch-index.ts`: its stored-copy fallback (the browser's cache) moves behind a small interface, so the web keeps the Cache API and the app gives its own store.
- A check (lint or the build guard) that nothing under those three folders imports React, MapLibre, or a browser global.

## Acceptance checks

- The web's `npm run check` passes unchanged; the app builds and reads the published map through the shared reader.

## Comments

- 2026-11-04: the lint check now exists (`eslint.config.js`, the block for `routes/{model,geo,published}`; PR #689, https://github.com/ParaOrg/Para/pull/689). `published/fetch-index.ts` still uses `caches` on two lines, each with an `eslint-disable-next-line` naming this ticket. Moving it behind an interface is still to do, so the Status stays.
- 2026-11-10 (smmariquit, AI-assisted): `published/fetch-index.ts` no longer touches `caches`. It reads earlier copies through `MapFileStore` (`setMapFileStore`), with no copy until one is given. The web's Cache Storage store is `routes/map/map-file-store.ts`: the public map gives it in `app/public-map/main.tsx`, the contributor page in `contribute/map/published-source.ts` (not its `main.tsx`, which would push its opening chunk past the 31 kB budget). Both `eslint-disable` lines are gone. Branch `refactor/map-file-store`. Still open here: the `@/shared/utils/geo` imports the native spike found (02).
- 2026-11-10 (smmariquit, AI-assisted): the core's one import outside its folders is `@/shared/utils/geo` (15 files). The native spike resolves it with the `@/*` path and a Metro watch folder; the lint block now covers `src/shared/utils/geo.ts` as well. Branch `chore/guard-shared-geo`. Left for this ticket: the app reading the map through `fetchIndex()` with its own `setMapFileStore`, which waits on 02's branch.
- 2026-11-10 (smmariquit, AI-assisted): with no network, `fetchIndex()` now asks the store for the current path's copy before the older paths. The web's worker answers with that copy itself, so nothing changes there; the app, with no worker, needs it. The new map-file test gives a store of its own and reads its copy offline, so 06 (offline map) can build on it.
- 2026-11-10 (smmariquit, AI-assisted): the app now reads through the shared reader. `map-file.ts` has `setMapFileOrigin`, which both `fetchIndex` and `fetchLine` fetch from (the web gives none). `native/App.tsx` gives `https://www.para-commute.org` and calls `fetchIndex()`; it bundles for Android, and the same call in Node read the live index (53 directions, 39 with a line). Branch `feat/native-shared-reader`, which stacks the 02 spike on this ticket's branches. That meets this ticket's acceptance check except a run on a phone; no store is given yet, so offline there is no copy (06).
