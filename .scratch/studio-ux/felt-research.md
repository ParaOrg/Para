# Felt: what the studio could borrow

Research for the owner, 2026-11-04. Felt (felt.com) is a collaborative web map editor. Almost everything here comes from its help centre (help.felt.com, changelog dated 3 Nov 2026). Anything not checked is marked **unverified**.

Dropped by the owner on 2026-11-04 ("give up felt"); kept for reference. These were ideas, not decisions. The owner picks which to design. Nothing is built until there's a Figma design and a ticket (`spec.md`, wave 3).

## What the studio already has

Felt does these, and so does the studio. They need no work:

- **Route drawing that snaps to roads.** Felt has a Route tool with travel modes. The studio snaps every segment through the router.
- **Insert, straighten and delete points.** Felt drags a midpoint to insert a point. The studio clicks a segment to insert one, Shift-clicks a segment to straighten it (Felt's Shift-click straight segment), and right-clicks a point to delete it.
- **Extend from a line's end.** Felt has an Extend action on an end vertex. The studio has Extend, which borrows a saved line.
- **Undo, Enter to finish, basemap switch** (streets, satellite, terrain).
- **The address remembers which map is open** (`?map=`).

Felt has no review flow, no version history and no diffs. The studio's Draft → Pending → Approved, with its comparison, is already further along than anything Felt offers.

## Shortlist: the ideas that fit the studio best

Ordered by how much each would help three editors working on routes. Size is a rough guess: S is a small PR, M a few, L a project.

| # | Idea | In Felt | In the studio | Size | Needs |
| --- | --- | --- | --- | --- | --- |
| 1 | **Comments pinned to the map** | Press C, click a place and type. A comment keeps the place and the view, takes @mentions, and can be resolved. "Resolve and next" works through a list. [comments](https://help.felt.com/share/comments) | Send back with a note pinned where the problem is ("the jeep turns here, not there"), and a list of open notes on a draft. | L | Design, database |
| 2 | **Swipe compare** | A draggable divider, with each layer on the left, both sides or the right. [compare](https://help.felt.com/tools/compare) | In Review, swipe between the approved line and the draft's line. Today they sit side by side. | M | Design |
| 3 | **Shortcuts panel** | **?** opens every shortcut, and each lights up as it's pressed. [shortcuts](https://help.felt.com/getting-started/keyboard-shortcuts) | One place that lists Undo, Enter, F, Shift-click and right-click. Today they are only learnt by reading the toolbar's hints. | S | Design |
| 4 | **Link to a route and a view** | "Copy link" adds `?loc=lat,lng,zoom`. "Copy link to feature" opens that feature. [navigate](https://help.felt.com/maps/navigate-the-map) | "Copy link" on a trip card or a draft, so one editor can send another the exact route and place. Builds on `?map=`. | S–M | Design (the button) |
| 5 | **Who else is here** | Avatars of the people on the map. A feature being edited is outlined in that person's colour. [permissions](https://help.felt.com/administration/permissions) · [edit features](https://help.felt.com/layers/edit-features) | The studio already says "Being changed by NAME" on a card. The map could show it too, on the line itself, before anyone opens the card. Live cursors would need a realtime channel. | M (outline) · L (live) | Design; live also needs Supabase Realtime |
| 6 | **"In view" on the contributions list** | The table has a **Visible** toggle that keeps only features in the current view. [table](https://help.felt.com/tools/table) | The Contributors map already reads the area in view. Making it an explicit toggle on the list would let an editor see every ride in the date range too. Check with the owner how the list should behave. | S | Design |
| 7 | **Solo one route** | Opt/Alt-click a layer's eye to show only that layer. [legend](https://help.felt.com/layers/legend) | On a busy corridor, show only the route being checked, with every other line faded. | M | Design |
| 8 | **One search for places and routes** | Press / and one box finds addresses, coordinates and your own features. [search](https://help.felt.com/tools/search) | Find a route, a hotspot or a street by name, then fly to it. | M | Design |
| 9 | **Snap to existing points** | While drawing, the pointer snaps to the nearest point of any visible shape. [edit features](https://help.felt.com/layers/edit-features) | Snap a hotspot box's corner, or a line's first point, to a nearby hotspot's corner, so boxes don't overlap by a few metres. | M | Owner: is overlap a real problem? |
| 10 | **Measure** | Press M for a line or area, with a running total. [measure](https://help.felt.com/tools/measure) | Measure a gap or a walk between two hintuans, without drawing a route. The trip card already shows a direction's distance. | M | Design |

## Ideas that fit less well

- **Tool keys** (P for pin, L for line, R for route). The studio has few tools, and they start from the New menu. Keys for New route and New hotspot are cheap if the owner wants them.
- **Sticky notes and free attributes on the map.** These overlap with comments (1). Comments fit the review flow better.
- **Style by data, analysis tools, dashboards.** Felt is a general GIS tool, and the studio draws one kind of thing. These could suit the Contributors map later (rides by hour, for example), not now.
- **Required fields and dropdowns prefilled from existing values** in forms. The save sheet already decides what's required. Prefilling fares or signboards from what already exists could help, but it's a design question for the save sheet.
- **AI assistant and MCP server.** Out of scope.

## Ideas for the contributor app, not the studio

From Felt's Field App ([tour](https://help.felt.com/field-app/tour-the-field-app), [offline](https://help.felt.com/field-app/work-offline)):

- **Plain sync-status words:** Up to date, Syncing, Changes to sync, "Couldn't sync — open to fix".
- **A GPS accuracy readout** while recording.

Felt's Field App has no background track recording. The contributor app already does more than it here.

## Sources

The help centre, read in full through help.felt.com/llms-full.txt, and the pages linked above. The Field App's launch date is unverified (probably late 2025). One community thread from Nov 2024 reported walking routes failing at trail forks; whether that is fixed is unverified.
