---
status: proposed
date: 2026-11-05
---

# Attached starts and ends

Some jeepney routes leave from more than one terminal yet are the same route: one main line, one name. Today the studio can only draw them as separate routes (or as an [extension](../../CONTEXT.md), which is a new route). On 2026-11-05 the owner decided to add **attached starts** and **attached ends**: a short extra line from another terminal that joins the main line partway along. The plan is `.scratch/attach/spec.md`.

## Decision

- A route can have attached starts and attached ends, several of each.
- The route keeps its main line and its name (the main start's). An attached stretch never renames it.
- On the return trip an attached terminal can be where the jeep ends. An attached start on one direction can be an attached end on the return.
- A ride from an attached terminal does not necessarily cost the same as from the main start, so each attached stretch needs its own fare information. How it is stored is open (see the spec).
- On the commuter map, attached stretches are drawn fainter than the main line. Tapping a terminal on an attached stretch shows the route as "A – Z (also from A2)". When a commuter is near an attached terminal, directions suggest boarding there.
- In the studio, Attach is a mode on the drawing toolbar, after Move, Snap and Draw. It reuses Snap and Draw rather than adding a new way of drawing, and the stretch snaps onto the main line where it joins. It goes through drafts and review like everything else. Attach and Extend stay separate tools.
- Storage idea, to confirm in Phase 1: each attached stretch belongs to a direction and holds its side (start or end), its own line, its terminal hotspot, and its join point as a distance along the main line.

## Consequences

- **The published map's files change shape.** Phones hold old copies of the index and line files (the installed app works offline), so the change must be additive: an old reader must keep working on a new file, and a new reader on an old one. The index already carries a schema number; whether the number moves or the fields are optional additions is open.
- **The public page's size budget is nearly full:** 412.3 of 413 kB gzipped (`scripts/checks/build-weight.mjs`). The commuter-side code (reading the stretches, drawing them faint, the card wording, the boarding suggestion) may need trimming elsewhere or the owner's OK to raise the budget.
- **One migration** adds the table (or columns) for the stretches, with Row Level Security like the route tables. `database.types.ts` is regenerated after it.
- The studio's review, draft and publish paths must carry the stretches, so a stretch is published only with its route.
- The commuter app ([ADR 0008](0008-the-commuter-app-is-react-native-expo.md)) shares the published map's reader, so it gets the new fields from the same code.
- Needs the owner's Figma for the Attach states and the faint look; no phase starts without the owner's Yes.
