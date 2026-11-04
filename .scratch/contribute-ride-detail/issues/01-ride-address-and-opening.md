# 01: The ride's address and opening it

Status: resolved (#677, #679)
Type: task
Blocked by: —

Spec: [../spec.md](../spec.md), "Opening a ride".

## What to build

- `#ride/<id>` as a screen inside History: Back returns to History, a reload stays on the ride, no toolbar, the map live under it.
- A tap on a History card opens its ride. The ⋮ menu stays until 04, so nothing is lost meanwhile.
- The screen: the back button and the folded sheet with the title and → end (4558:11792). A ride not in History goes back to History; while one is still being found, Back stands alone (the owner, 2026-11-03).
- `page-layout.ts` and its unit check know the new screen; `tab-motion.ts` reads `#ride/<id>` as `#ride`.

## Done when

- Stories: a ride, a long name, no end, still being found.
- `npm run check` passes.
