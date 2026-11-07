# 06: A pin where a landmark search lands

Status: ready-for-agent (claimed by the place-search builder; starts once release 0.4.0 is in main)
Type: task
Blocked by: release 0.4.0 merged into main (the hub says when)

The owner's answers, 2026-11-07 (their Q59 to Q63, all as recommended). Closes the marker half of item 10 in `../README.md`'s "Owner to design later" list.

## What to build

- **When:** a commuter picks an OpenStreetMap **landmark** result. Not a Para place: its hotspot marker already marks it.
- **Look, for now:** the existing pin shape (the S and E pins: `routes/map/hintuan-pin.tsx`, its `hintuan-pin-icon.svg`, the Map/Pin tokens) in a neutral colour, so it cannot be read as S or E. No new token unless one is missing; then ask the hub first. On the "Owner to design later" list.
- **How long:** until the search is cleared, another result is picked, or the routes-near-here panel is closed.
- **Where in the code:** a small map component beside the search (`routes/map/`), drawn by the public map while a landmark's routes-near-here panel is open. Loaded with the search, never in the shared chunk (`vite.config.ts` keeps `routes/search` out of it; the pin goes with it).

## Not in this ticket

"Set as destination" (the landmark as the trip's E): ticket 07.

## Acceptance checks

- Stories: the pin alone, and on the panel's states (open, closed, another pick).
- A phone-test check: pick a landmark, the pin is on its point; close the panel, the pin is gone; pick another, it moves.
- Shared code unchanged against staging (health.mjs before and after). A ds-reviewer PASS; `npm run check`; CI green; merged into staging.
