# 02: Footbridges on the commuter map

Status: resolved (the owner's answers 2, 3 and 4 as recommended)
Type: task
Blocked by: 01

## What to build

- **The lines.** A map layer drawing the footbridges from street level (about zoom 15, the owner's answer to question 2), under the routes and hotspots, over the basemap.
- **Elevators.** Marked where the file has them (question 3).
- **Loading.** The file is fetched the first time the map reaches that zoom, never with the page. The layer's code is a chunk of its own, kept out of `shared` in `vite.config.ts` as place search is.
- **No taps.** The layer takes no taps at first (question 4).
- **The look.** Built for now from existing tokens and on `../README.md`'s "Owner to design later" list.

## Acceptance checks

- `health.mjs` before and after: the shared chunk and the opening code unchanged, give or take the wiring.
- A story of the layer on an empty map (lines, an elevator, a covered footbridge), and a check in phone-test or map-pins-test: below zoom 15 no request for the file; at 15 the layer draws; offline after a first visit it still draws.
- A ds-reviewer PASS; `npm run check`; CI green; merged into staging.

## Answer

Built:
- `routes/published/footbridge-file-schema.ts` and `fetch-footbridges.ts` read the file.
- `routes/map/footbridge-layer.ts` draws it: the lines, and the elevators as dots, from zoom 15, under every layer of Para's own.
- `routes/map/use-footbridges.ts` loads the layer's chunk and the file the first time the map reaches zoom 15. `vite.config.ts` keeps both out of `shared`.

Shared code against staging: 68.4 → 68.5 kB (the hook and two paint keys); the opening code still 408.3 kB.

Checks:
- **Stories:** `FootbridgeLayer` StreetLevel and ZoomedOut.
- **`map-pins-test`:** no request at the opening view; the file and the chunk each fetched once at zoom 17; a footbridge and its elevator drawn under Para's layers; none at zoom 14.
- **Offline:** the worker's `footbridges` rule (ticket 01) keeps the file once read. No browser suite proves the offline read: the preview build keeps its map to itself, so `pwa-test` cannot zoom to street level.
