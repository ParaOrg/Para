# 03: Move the published map's reader where the studio may use it

Status: resolved
Type: task
Wave: 2
Who: Sonnet
Blocked by: contribute/03

## What to build

`../../contribute/rule-changes.md` item 1.8, as the owner picked it. A refactor only, in its own PR; nothing behaves differently.

With option A (recommended): move the reader into `src/features/routes/published/`:

- `published-map/api/fetch-index.ts` and `fetch-line.ts`;
- `published-map/schemas/index-schema.ts` and `line-file-schema.ts`;
- the file addresses they need from `published-map/map-file.ts` (or the whole file, with `vite.config.ts` and `scripts/checks/check-build.mjs`, which read it by its path, following it).

`published-map` keeps freshness, the notices and the installed app's updates, and imports the reader from routes. `git mv`, so history follows.

## Files it owns

`src/features/published-map/`, `src/features/routes/published/`, the paths in `vite.config.ts` and `scripts/checks/check-build.mjs`, `scripts/publish/publish-map.mjs`'s imports, `docs/architecture.md` (regenerated).

## Acceptance checks

- The public page's chunks are the same apart from hashes and module paths; the shared figure within 0.1 kB.
- `npm run check`; `commuter-test`, `phone-test` and `pwa-test` pass.
- The publish, run by hand, writes byte-identical files.

## Comments
