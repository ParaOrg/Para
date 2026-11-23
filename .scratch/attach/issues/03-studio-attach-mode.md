# 03: Studio Attach mode

Status: needs-info
Type: task
Blocked by: 01

Needs the owner's Figma for the Attach states (the toolbar pill is in 4614:15351; the rest is not drawn) and the owner's Yes. No session makes up the look.

## What to build

Attach as a mode on the drawing toolbar after Move · Snap · Draw. It adds no new way of drawing: the editor picks a route's direction, chooses start or end, then draws with Snap and Draw. The stretch snaps onto the main line where it joins, and the join distance is computed from the snap. The terminal is a hotspot the editor picks or draws. Saves go through drafts and review like everything else. Attach and Extend stay separate tools.

## Files it owns

- `src/features/studio/drawing/` (the mode, reusing Snap and Draw)
- `src/features/studio/panels/` (the stretch's details, its fare information once decided)
- `src/features/studio/data/` (only the calls Phase 1 added)
- Stories for each Attach state

## Acceptance checks

- `npm run check` passes, and the studio browser suite.
- A stretch can be drawn, edited, deleted, and sent for review.
- The join point lands on the main line and its distance is saved.
- Several starts and several ends on one route work, and an end can be set on the return direction.
- Keyboard-accessible, labelled, and the Attach pill matches the Figma.
