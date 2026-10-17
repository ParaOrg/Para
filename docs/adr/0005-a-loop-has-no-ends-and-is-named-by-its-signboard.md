---
status: accepted
date: 2026-10-17
---

# A loop has no ends and is named by its signboard

A loop is a route that goes round one way with no head and no tail: UP Ikot
goes round the UP campus and UP Toki is the same streets the other way, each
with a signboard of its own. A loop is called by its signboard, which it must
have, and nothing is generated from ends it does not have. This partly
supersedes ADR 0002 for loops only: every other route is still named from its
two ends, with no override. We chose the signboard over a generated name
because a loop has no ends to generate one from, and it is what the jeep is
called by; ADR 0002 named this very case as its trigger, and the fix it told
us to resist, a per-direction override, is not what this is: a loop has one
name, not two directions that need different ones.

The word the commuter and the editor read for a loop, in a list's row and in
a trip's header where "Papunta" would stand, is **Ikot** (the owner's, on
2026-10-17). The concept stays Loop in the code, the database and the
glossary.

## Consequences

- `route.is_loop` (0021), set when the route is made and never changed. A
  loop has null ends, one direction (never a way back, so no slot, no "Draw
  the return trip" and no SWITCH), and a signboard. Two loops may share a
  signboard only when their via tells them apart.
- A loop's line is closed to within `LOOP_CLOSED_M` (15 m); the database
  cannot read geometry, so the studio's save and the publish check it.
- Every place a loop passes is a stop in its timeline, a terminal box on it
  counting as one. The timeline starts at the loop's tip (see the glossary)
  and comes back to it.
- A loop in the published index would blank every installed app that reads
  the shape before it, so the index gains a shape that carries loops and the
  older ones do not.
- A place a loop passes twice is listed once, at its first pass, until
  passes get numbers (PLAN.md, M8).
