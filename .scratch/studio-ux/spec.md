# Studio UX

Status: ready-for-agent

Planned with the owner on 2026-11-04. The studio's three maps and its review step are built (`../studio-maps/spec.md`). This project makes the studio safe and pleasant to work in: first the bugs that lose an editor's work, then accessibility, then polish from the owner's designs.

One small pull request per task, into `staging`. Each task gets its own `issues/NN-<slug>.md` when it starts.

## Decisions so far

(The drawing decisions of 2026-11-04 are under wave 3.)

- **Only a draft's maker can discard it** (the owner's 1a, 2026-11-04). Another editor never discards it, not even after 7 days. This settles the 7-day rule left open in `../studio-maps/issues/05-playground-drafts.md` and finding studio-09 in `../codebase-review/studio.md`.
- **A delete made while the editor has a draft of that route goes into the draft** (the owner's yes, 2026-11-04). It isn't approved in the same press. The notice says it was added to the draft, to review in Drafts. A delete with no draft open is approved at once, as today (studio-01).

## Where the 2026-10-28 review stands

Checked against `staging` on the night of 2026-11-04, after wave 1's pull requests. The findings are in `../codebase-review/studio.md`.

| Finding | State |
| --- | --- |
| studio-01: delete approves the editor's other unreviewed changes | Fixed (#695): a delete joins the editor's open draft |
| studio-02: Edit and the signboard editor open the approved version, then overwrite the editor's own draft | Fixed for the line (#699), the signboards (#703) and the hotspot (#710). Left: the save panel's facts after "Edit draft details", after the live route sheet (wave 3, item 13) lands in `save-panel.tsx` |
| studio-03: every approval rewrites links, causing false conflicts | Open, database: needs the owner's OK |
| studio-04: sheets aren't modal | Partly fixed: the map is `inert` while a sheet is open. Dialog semantics are wave 2; the route sheet stops being a modal with item 13 |
| studio-05: Close the loop offered after Extend | Fixed |
| studio-06: a Follow reply joins onto a drawing that has moved on | Fixed: `connect` refuses a line that arrives after the drawing changed |
| studio-07: false "This draft changed" after Edit draft details | Fixed |
| studio-08: editors can rewrite any column of their draft | Open, database: needs the owner's OK |
| studio-09: any editor can discard any draft | Fixed in the UI (#696). The database check waits on the owner's OK |
| studio-10: four query caches | Fixed: one client in `studio-session-provider.tsx` |
| studio-11: aborted router requests keep their turn | Fixed: `router-queue.ts` |
| studio-12: the two-editors suite's load never waited | Fixed |
| studio-13: browser suites test the drafts-off path | Partly fixed: `save-drafts-test` runs the core flows with drafts on. Retiring the drafts-off copies waits on retiring the flag |
| studio-14: the review flow never ran in CI | Fixed: "Review suites on the isolated preview" |
| studio-15: two two-editors checks could not fail | Fixed |
| studio-16: stale database types, `as never`, env without Zod | Env fixed (#706). Left: regenerate `database.types.ts` and drop `as never` in `drafts.ts` |
| studio-17: the stored drawing and the router's replies unvalidated | Fixed |
| studio-18: raw codes on screen, inline query keys | Fixed (#705, #711). Left: Supabase's own auth sentences in sign-in and change-password, and two nested ternaries |
| studio-19: the direction list pages by a changing column | Fixed |
| studio-20: five files far over the size limit | Wave 4 |

## Waves

### Wave 1: bugs that lose an editor's work

1. **Delete with a draft open** (studio-01), as decided above.
2. **Only the maker discards** (studio-09). Hide "Discard…" on another editor's draft. The check in `discard_draft` and the `draft_delete` policy is a database change. It waits for the account-deletion migration another session is writing, and the owner's OK on the migration.
3. **Edit opens the editor's own draft** (studio-02): the line, the facts, the hotspot panel and the signboards.
4. **Check studio-06 and studio-12 to studio-19**, and fix whatever is still open, one PR each.

### Wave 2: accessibility

5. **Real dialogs** for the save sheet, the hotspot panel and the sign-in, change-password and reset-password panels: `role="dialog"`, an accessible name, focus trapped inside and returned on close (`.claude/CLAUDE.md`, Accessibility). One shared dialog in `shared/ui/` if two or more can use it. The look doesn't change.

### Wave 3: drawing, the owner's asks of 2026-11-04

The owner's decisions on 2026-11-04. Felt was dropped; `felt-research.md` stays for reference only. Where there's no Figma design yet, the owner said to work around it for now: build from the existing look and the owner's words, and the owner restyles later.

6. **Brand colour on the drawing.**
   - The line being drawn, its points' rims and a new hotspot box's fill: `parabrand-800` (the primary). Today they are rose/600.
   - Extend's borrowed stretch: `parabrand-300` (the paler one). Today it's blue/600.
   - The Start pill is green and the End pill red, each with its own colour.
   - The U-turn mark stays amber.
   - Any other blue left in the drawing goes; it isn't used any more.
7. **The general route line in brand colour.** Figma's `Map/RouteLine/surface-default` becomes `parabrand-300` and `Map/RouteLine/surface-selected` becomes `parabrand-800`. This session changes the variables in the owner's Figma file, as the owner asked, then runs `sync-tokens`. It changes the public map too. The terminal pin, the Papunta trail and the walked line stay as they are.
8. **Arrows on the drawn line.** The public map's moving chevrons (`routes/map/direction-arrows.ts`), on the line's solid stretches only: not on the preview, and not on dashed stretches.
9. **A live preview in Snap.** While the cursor rests, the routed path from the last point to the cursor shows as a solid `parabrand-300` trail. A click makes it part of the line. There's no preview in Draw. It uses today's public router, asked only when the cursor pauses, at most once a second. Measured on 2026-11-04 at about 0.4 s an answer, so the trail shows about 0.5–1.5 s after the cursor stops. A routing server of our own (a few hundredths of a second, no limit) is not planned. The owner decides after trying the preview, and moving would change only `drawing/snap.ts`.
10. **The Snap | Draw toolbar** from the owner's Figma frame (node 4304:21645). It is a flattened capture: Undo / Redo in one pill, and Snap | Draw | Done in another. The owner said to work from the picture for now. "Tap" becomes "Snap".
11. **Closing a loop by its first point.** When the cursor nears the line's first point, a small "connect" icon shows. A click closes the line, and the route becomes an Ikot: no Start or End on the line, and the save sheet asks for the signboard instead of the two ends. The same icon appears where a return trip's line reaches its outbound's start (this session's call, as the owner allowed). The icon is worked around, after researching the pattern on Mobbin. An ikot's timeline keeps today's Tip rule (`CONTEXT.md`, Tip), the owner's 7a: no fixed start, nothing random.
12. **Curves in Draw, the way Figma's pen tool makes them.**
    - Click places a corner. Click and drag places a smooth point with mirrored handles. Alt-drag moves one handle alone, and double-clicking a point switches it between corner and smooth.
    - Afterwards, an editor can drag a point, a handle or the line itself.
    - Only Draw's stretches bend, never a snapped one (the owner's 1).
    - The handles and points are worked around in `parabrand-800`.
    - Stored as a third kind of segment, with its handles, in the existing `segments` jsonb. It needs no migration: the column checks nothing. The publish flattens a curve into points, so the public map doesn't change.
    - The biggest item here, likely a few PRs.
13. **The route's sheet open while drawing** (the owner's 1a and 3, 2026-11-04). On a computer, a panel stays on the side of the screen the whole time a route is drawn. The map stays usable beside it, and Done becomes Save inside the panel. Its fields fill themselves as the line is drawn: when the line reaches a place, the panel shows that place as an end at once, so the route's name is seen before finishing. The phone isn't designed for: editors use laptops, and there's no phone design. On a phone it must keep working, with no layout of its own. Worked around until the owner designs it.

### Wave 3b: polish, from the owner's designs

14. **The map's draft markers** say "Draft: NAME" for every draft. Whether they show Pending or who is changing it is the owner's design.
15. **The hotspot card**: the rest of the card (the TODO in `panels/hotspot-card.tsx`).

### Wave 4: housekeeping, beside the rest

16. **Split the long files**, biggest first, one file per PR, after the wave 1 fixes in the same files have landed: `drawing/use-drawing.ts` (519 lines), `data/routes-write.ts` (365), `app/studio/workshop.tsx` (308), `panels/use-save-facts.ts` (261), and so on.

### Needs the owner's OK: database

- **studio-03:** write only the links that changed on approval, and rebuild a kept hotspot draft's links from the approved directions.
- **studio-08:** grant editors update on `payload`, `status`, `submitted_at` and `note` only, and drop `editor_id is null` from the policy's check.

Both wait for the account-deletion migration in `supabase/` to land first.

## Waiting on the owner (not this project's work)

The live checks in `../studio-maps/issues/05`, `06` and `09`: two editors at once, approving one real draft through a publish, and using one contribution's line and hintuan.
