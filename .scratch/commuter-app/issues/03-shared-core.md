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
