# 02: Footbridges on the commuter map

Status: needs-triage (after 01; the owner's answers to questions 2, 3 and 4)
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
