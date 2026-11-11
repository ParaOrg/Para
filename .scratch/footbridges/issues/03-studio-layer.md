# 03: Footbridges in the studio

Status: resolved (the owner's answer 9 as recommended)
Type: task
Blocked by: 01

## What to build

- **What.** The same footbridge file on the studio's maps (the workshop and the Contributors map), read-only, as a reference for editors placing hintuans and drawing routes.
- **How it's switched.** A toggle with the studio's other map layers, off by default (question 9).
- **What it doesn't do.** It marks nothing, saves nothing and changes no draft.
- **The look.** On `../README.md`'s "Owner to design later" list.

## Acceptance checks

- A story with the toggle off and on.
- A studio suite check: the toggle draws the layer and drawing a route still works with it on (the drawing suites click the map: keep their click points clear, as `regression-gestures` learned with the search bar).
- A ds-reviewer PASS; `npm run check`; CI green, the drawing suites included on the staging push; merged into staging.

## Answer

Built:
- **The studio's side.** `studio/maps/footbridges-switch.tsx` holds the switch (off at first, not kept between visits) and draws the public map's layer while it is on, through `useFootbridges(map, isShown)`. It wraps the workshop's location control (`app/studio/workshop-location.tsx`), and the workshop and the Contributors map share that map.
- **The card's row.** The Map Style card shows the switch under Location Labels. The page adds its own rows through `MapStyleRowsContext` (`routes/map/map-style-rows.tsx`), with `MapStyleSwitchRow` the row both share.
- **Off again.** Turning it off hides the layers; on again fetches nothing more.

Checks:
- **Story:** MapStyle StudioFootbridges.
- **`map-pins-test`:** with the switch off, nothing asked for at zoom 17; on, drawn; off, none drawn; on again, drawn, the file asked for once in all.
- **Budget:** shared code 68.5 → 68.8 kB. The hook, which both pages import, now shows and hides the layer by name.
