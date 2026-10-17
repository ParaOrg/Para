# Loops: a route that goes round with no ends (UP Ikot, UP Toki)

Status: approved by the owner, 2026-10-17 ("Goo"). Built in slices; see "Builders" at the end.

## Where it came from

Gab, drawing UP Ikot in the studio: it goes round the campus one way, "walang specific start… deredeterso lang"; UP Toki is the same loop the other way, with its own signboard. The save panel refused it ("The two ends have to be different places.") because every route has a head, a tail and two directions.

The owner: "There should be a toggle where a route is closed — it has no end point. When the card shows it, its tip is the nearest location of the user; the spots are the hintuans, and there's no papunta and pabalik."

## The owner's decisions (2026-10-17)

| Question | Decision |
|---|---|
| The word for a loop, in lists and in the trip header where "Papunta" stands | **Ikot** (shown to commuters and editors; code and glossary may keep `loop`, `is_loop`, with "shown as Ikot") |
| SWITCH on a loop's trip | **Hidden** |
| Distance and fare tiles before a pick | **The whole loop** |
| Design | **Ship a functional first version on the current card**; the owner may restyle it in Figma later |
| Opened from a hintuan's card | that hintuan is the tip (the plan's default, accepted with "go") |
| Everything else | the plan's defaults below |

## The plan

(Written by a read-only planner against staging 7509b76; the owner's decisions above override it where they differ — notably LOOP_WORD is 'Ikot', not 'Loop'.)

I read the staging tree at 7509b76. Nothing was written. All paths below are under `/home/user/ParaPo/`.

## 0. Findings that change or sharpen your defaults

| # | Your default | Verdict | Why |
|---|---|---|---|
| 1 | One variant, closed line, made with Close the loop | **Keep, with three additions.** (a) Offer "⟲ Close the loop" on any new route line with ≥3 points, closing on its own first point; today it only appears for return trips (`use-loop-closing.ts`). (b) The Loop toggle starts ticked when the line is closed. (c) `is_loop` is set when the route is made and never changes. | Without (c), a two-ended route could become a loop while its pabalik row still exists, or a loop could lose its loop flag with no slot under it. |
| 2 | No ends; the name is the signboard, which is required; uniqueness by signboard/via | **Keep.** Uniqueness is `(lower(btrim(signboard)), coalesce(via,''))` where `is_loop`. | This breaks ADR 0002 ("names are generated from the ends"). That ADR names exactly this situation as its trigger, so it needs an ADR 0005. |
| 3 | A terminal box counts as a place | **Keep, but it costs one rule change.** On loops, terminal links must be made automatically. | Today `syncHintuanLinks` and `listedAlong` link only hintuans; terminal links are picked by hand. |
| 4 | Tip = nearest hintuan, else first drawn; the ride wraps | **Keep, with two additions.** (a) If the trip was opened from a hintuan's card, start at that hintuan. (b) The rows stay in place and the ride wraps; picking a start does not re-order the timeline. | (b) follows the owner's #173 rule: don't move things under the rider. |
| 5 | Next free migration number | **0018 is not free.** The plans reserve 0018 `review`, 0019 `contributions` and 0020 `backup_reader`, and contribute/09 reserves 0021 `signup_hook` if it turns out to be needed (`.scratch/contribute/database.md` §10). **Use `0021_loops.sql`, or 0022 if 0021 already exists.** | This avoids renumbering four tickets. Application order doesn't have to follow file order (the README already shows 0015 applied before 0013). |
| — | PLAN M9 puts `is_loop` on `route_variant` and detects closure within 50 m | **Put it on `route`, and use 15 m.** | The ends and the signboard are columns of `route`, and a CHECK constraint can only read its own row. 15 m is `LOOP_GAP_M` already used in `loop-closing.ts`, and the Close button closes to 0 m anyway. |
| — | M8 pass numbers | **Not needed now.** | Each place on a simple loop is passed once. The seam is also fine: `passIndex` keeps the first touch, so a line that starts and ends in the same box makes one link. A place passed twice gets a save-panel warning (risk 5). |

## 1. Data model and migration

`is_loop` lives on **route**. The ends, the signboard and the uniqueness rule are all route columns. "Exactly one variant" is enforced with `reversed = false` (trigger) plus the existing `route_variant_one_per_direction (route_id, reversed)`. "At least one variant" is **not** enforced: a save is two requests, and orphans are already claimed by the next save (`routes-write.ts claimExistingRoute`).

There are no new tables, so no grants. The new column inherits route's table grants (anon SELECT, which the publish needs; authenticated S/I/U/D) and its row policies. RLS is unchanged. The two functions go in `private`, following 0005's revoke pattern.

`supabase/migrations/0021_loops.sql`:

```sql
-- ParaPo — a loop: a route that goes round, with no ends
--
-- The owner's ask, 2026-10-17, after an editor met it: "UP Ikot" goes round
-- the UP campus one way with no start ("walang specific start… deredeterso
-- lang"), and "UP Toki" is the same streets the other way round, with its
-- own signboard. A route is two ends and two directions (0006), so neither
-- could be saved: the save panel refuses a route whose two ends are one
-- place. A loop is a route with neither:
--
--   * route.is_loop, on the route because the ends are the route's. A loop
--     has no head and no tail; every other route keeps both, as before.
--   * A loop is called by its signboard (the generated name has no ends to
--     read), so a loop must have one, and two loops may share one only when
--     via tells them apart, as two routes may share both ends
--     (route_ends_unique, which a loop's null ends never meet).
--   * A loop is one direction, the way it was drawn: its way back is refused
--     here, and route_variant_one_per_direction (0006) leaves room for one.
--     The other way round is another loop, with its own signboard.
--   * A route is made a loop or not and stays so, so a two-ended route can
--     never become a loop with a way back still under it.
--
-- Not enforced: that a loop has its one direction. A save is two requests;
-- the studio claims a route left without one (routes-write.ts).
--
-- Every existing row is_loop false and keeps both ends, so the checks hold
-- as they are and nothing is rewritten. No new table, so no grants (README,
-- "Grants for new tables"); the column is read and written under route's
-- own grants and policies (0005, 0015, 0017).
--
-- For 0018 (the review step, not yet written): make route_loop_unique
-- partial on status as well, and let its "both ends approved" guard pass a
-- loop, whose ends are null.
--
-- Not applied by the session that wrote it: the owner applies it, as
-- postgres, from the SQL editor with the ledger row (README, "Applying a
-- file"). Safe to run twice.
--
-- Reversible, once no loop is left:
--   drop trigger if exists route_variant_loop_one_way on public.route_variant;
--   drop trigger if exists route_loop_fixed on public.route;
--   drop function if exists private.loop_one_way();
--   drop function if exists private.loop_fixed();
--   drop index if exists public.route_loop_unique;
--   alter table public.route
--     drop constraint if exists route_loop_signboard,
--     drop constraint if exists route_loop_ends,
--     alter column head_stop_id set not null,
--     alter column tail_stop_id set not null,
--     drop column if exists is_loop;

-- 1. The flag.
alter table public.route
  add column if not exists is_loop boolean not null default false;

comment on column public.route.is_loop is
  'A loop: goes round one way with no head or tail, one direction, called by its signboard. Set when the route is made; never changes.';

-- 2. A loop has no ends; every other route has both.
alter table public.route
  alter column head_stop_id drop not null,
  alter column tail_stop_id drop not null;

alter table public.route drop constraint if exists route_loop_ends;
alter table public.route
  add constraint route_loop_ends check (
    (is_loop and head_stop_id is null and tail_stop_id is null)
    or (not is_loop and head_stop_id is not null and tail_stop_id is not null)
  );

-- 3. A loop is called by its signboard.
alter table public.route drop constraint if exists route_loop_signboard;
alter table public.route
  add constraint route_loop_signboard check (
    not is_loop or coalesce(btrim(signboard), '') <> ''
  );

-- 4. One loop per signboard, unless via tells two apart. Case and the
--    spaces at either end fold, as the terminal index folds a place (0014).
create unique index if not exists route_loop_unique
  on public.route (lower(btrim(signboard)), coalesce(via, ''))
  where is_loop;

-- 5. A loop is one direction: the way it was drawn, never a way back.
create or replace function private.loop_one_way()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reversed and exists (
    select 1 from public.route r where r.id = new.route_id and r.is_loop
  ) then
    raise exception 'A loop has one direction: it has no way back.'
      using errcode = '23514', constraint = 'route_variant_loop_one_way';
  end if;
  return new;
end;
$$;

create or replace trigger route_variant_loop_one_way
  before insert or update of route_id, reversed on public.route_variant
  for each row execute function private.loop_one_way();

-- 6. Made a loop or not, and stays so.
create or replace function private.loop_fixed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_loop is distinct from old.is_loop then
    raise exception 'A route is made a loop or not, and stays so.'
      using errcode = '23514', constraint = 'route_loop_fixed';
  end if;
  return new;
end;
$$;

create or replace trigger route_loop_fixed
  before update of is_loop on public.route
  for each row execute function private.loop_fixed();

-- As 0005: a new function is executable by PUBLIC until revoked.
revoke all on function private.loop_one_way() from public, anon;
revoke all on function private.loop_fixed() from public, anon;
grant execute on function private.loop_one_way() to authenticated;
grant execute on function private.loop_fixed() to authenticated;
```

**Ledger row to paste with the file** (README pattern):

```sql
insert into supabase_migrations.schema_migrations (version, name, statements)
select to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'), '0021_loops', '{}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = '0021_loops');
```

**README changes** (`supabase/migrations/README.md`):
- Add the row `` | `0021_loops.sql` | not yet applied | | A loop: no head or tail, one direction, called by its signboard | ``. Fill it in after the owner applies it, as was done for 0017 (4b70c7d).
- Change the header to "numbered (`0001` to `0017`, then `0021`; `0018`–`0020` are planned, `.scratch/contribute/database.md` §10)".
- Add a 0021 row to database.md §10.
- Add a comment to `.scratch/studio-maps/issues/01-review-migration.md` carrying the 0018 note from the header.

**Owner's check after applying** (in one transaction, then rolled back):
- Inserts need `owner_id` from `private.editor`, because `auth.uid()` is null in the SQL editor.
- A loop with signboard 'TEST – Ikot' is accepted.
- 'test – ikot ' is refused with 23505 `route_loop_unique`; with `via` set it is accepted.
- A loop with no signboard is refused (23514).
- A non-loop with no ends is refused (23514).
- A `reversed=true` variant on a loop is refused.
- Flipping `is_loop` is refused.
- Then: the advisors show nothing new, and the §13 audit query is unchanged.
- Then regenerate `src/shared/types/database.types.ts` (read-only). B's writes won't type-check until this lands.

## 2. Studio (slice B)

**Save panel** (`src/features/studio/panels/save-panel.tsx`, with a new `loop-toggle.tsx` and story):
- The toggle "Loop: goes round, no ends" is the form's first control, under the point/km line. It starts ticked when `isClosedLine(line)` is true. It is locked when editing.
- When ticked, it hides: the Head and Tail `PlacePicker`s, `NewPlaceForm` (+ New place), `guessEnds`/`endsByHead`, and the "This line is the direction … of a new route …" box. That box becomes "This line is the loop **<signboard>**, one way round, as drawn".
- `RouteFields` moves to the top, with its label reading "Signboard (the loop's name, required)".
- The Via hint becomes "(only if another loop has this signboard)".
- The heading becomes "Save this loop" or "Update this loop".
- The preview is `loopTimeline(...)` starting from the first place drawn.

**Refusals** (`save-checks.ts`: new `loopSaveRefusal`, kept separate from `saveRefusal`), in this order:

| Check | Sentence (functional) |
|---|---|
| Signboard blank | "A loop is called by its signboard: write what the jeep says, like UP – Ikot." |
| Line's first-to-last gap > `LOOP_CLOSED_M` (15 m) | "A loop ends where it began. This line ends N m from its start: go back to the map and press ⟲ Close the loop." |
| Fewer than 2 places on the line | "A loop needs at least two places on it, so its trip has somewhere to start and somewhere to go." |
| Signboard+via already a loop (from the list; and on 23505 `route_loop_unique`) | `LOOP_TAKEN`: "Another loop already has this signboard. Give one of them a via to tell them apart." |

These are notices only and never block: a place passed twice ("passes X twice; only its first pass is listed"), and the existing U-turn and freehand notices.

**Files:**
- `use-save-facts.ts`: a loop branch with no ends. It provides `name = loopName(signboard, via)`, `loopGapM`, `signboardTaken`, `placesPassedTwice`, and a preview built with `hintuansAlong(..., { ...route, isLoop: true })`, which includes terminals.
- `use-route-save.ts`: the form gains `isLoop`; ends are null for a loop.
- `route-fields.tsx`: `isSignboardRequired` prop.
- `save-notices.tsx`: the two loop notices.

**Save path** (`src/features/studio/data/`):
- `routes-write.ts`:
  - `SaveInput` gets `headHotspotId`/`tailHotspotId: string | null` and `isLoop: boolean`.
  - Insert `{ is_loop: true, head_stop_id: null, tail_stop_id: null, … }`.
  - `claimExistingRoute` gets a loop branch: same three cases (orphan / slot / drawn), found with `.eq('is_loop', true)` and matched on trimmed, lower-cased signboard plus via.
  - Map 23505 on `route_loop_unique` to `LOOP_TAKEN`.
  - Edit route on a loop writes signboard, mode, fare_note and via only: no ends, never `is_loop`.
- `direction-rows.ts`: `slot` is null for a loop, so the insert sends `[drawn]` only.
- `hotspots-write.ts` `syncHintuanLinks`: for a loop, read `kind in (hintuan, terminal)` and manage both kinds of link.
- `route-export.ts`: `Way` gains `'loop'`.

**Return trip** hides itself: `returnTripLeft` is false because a loop has no slot, so the toast never offers "Draw the return trip", and `returnTripNotices` only runs for a parent route.

**Drawing:**
- `drawing/use-loop-closing.ts`: an `ownStart` mode with `closeAt = draw.controlPoints[0]`. It is on for a new route, or for editing a loop direction.
- `LoopPlan.other` becomes `'papunta' | 'pabalik' | null`.
- `loop-closing.ts`: `whyCannotCloseLoop` says "add two more points first" below 3 points.
- `draw-toolbar.tsx`: the title reads "End the line where it began".

**Editing an existing loop:** Edit route loads the drawing, Close the loop is available, and the panel opens with the toggle locked on. The same refusals apply, with `signboardTaken` excluding the loop itself.

**Studio cards:**
- The studio shares slice D's cards, so a loop is its own RouteCard in lists, and its trip has no SWITCH.
- `route-facts.tsx`: a "Loop · one way round, no ends" fact.
- `studio-trip-card.tsx`: no Extend on a loop. Picking a loop to Extend from is refused, because `extendEnds` is null.
- `use-delete-actions.ts`: the confirm reads `Delete the loop "UP – Ikot"?`. The delete itself works as is: emptying the only direction removes the route.
- `src/app/studio/workshop.tsx`: wire `ownStart`, and `useLoopTip(saved.selected, hotspots, { near: null, openedFrom: hotspots.selected })`.

## 3. Publish and old clients (slice C)

**Today a loop would break three things:**
- **The nightly publish.** `scripts/publish/publish-map.mjs` lines 344–351 `fail()` on a missing end, so one saved loop stops the publish for everyone.
- **Every installed app.** The reader's `rawRouteSummarySchema.head_stop_id: z.string()` (`src/features/routes/model/direction-schema.ts`) rejects null, and `parseIndex` refuses the **whole** index ("has a row this app cannot read"). `fetchIndex` deliberately shows no stored copy for a parse failure, so a loop in `index.v4.json` would take the map away from every installed shape-4 app.
- **The studio list.** `rawRouteRowSchema` rejects null ends the same way.
- `features/published-map` has no Zod schemas of its own; it only reads `MAP_FILE_URL`/`MAP_FILE_TOO_NEW`.

**So: map file shape 5**, the same way the ferry introduced shape 4 (commit 14b5f28):
- `src/features/routes/published/map-file.ts`:
  - `MAP_FILE_URL = '/data/index.v5.json'`, `MAP_FILE_SCHEMA = 5`.
  - `STORED_OLD = [v4, v3, v2]`.
  - Doc: "shape 5 is shape 4 with loops".
- `publish-map.mjs`:
  - Add `is_loop` to the route select.
  - A loop's `name` and `direction_name` are `loopName(signboard, via)`.
  - The missing-end `fail` applies only to non-loops. A loop with ends, or without a signboard, fails.
  - Append `is_loop: true` **last, and only on loops**, so every other row stays byte-identical.
  - Write `index.v5.json`. Then v4 = `withoutLoops(all)`, v3 = `withoutLines(withoutLoops(all), FERRY)`, v2 and map.json = `withoutLines(withoutLoops(all), EVERY_LINE)`.
  - **Before writing, assert shapes 1–4 contain no loop.**
  - Compute `published_at` and the shrink guard against v5 (`previousV5 ?? previousV4 ?? …`).
  - Loop line files are the same format.
- `scripts/publish/withoutLines.mjs`: add `withoutLoops` (drop loop variants and their links; keep stops).
- `scripts/checks/check-map-data.mjs`:
  - A loop has no ends, one direction, and a line closed within `LOOP_CLOSED_M`; warn when it has fewer than 2 linked places.
  - Skip the end-distance checks for loops.
  - A loop in a file with schema < 5 is a problem.
- Path and constant updates:
  - `vite.config.ts`: the SW map-file `urlPattern` path is a literal, so it must change to v5.
  - `scripts/checks/check-build.mjs`: the SW assertion path.
  - `.github/workflows/publish-map.yml`: comments, and add `index.v4.json` to "Check the older indexes".
  - `README.md`, `docs/adr/0001-…`, `scripts/research/*.mjs`.
- Commit `public/data/index.v5.json`. Run the publish after 0021 is applied; until a loop exists, v5 equals v4 apart from its schema number.

| Client | Reads | Sees loops | Effect |
|---|---|---|---|
| Shape 5 (new app) | `index.v5.json` | yes | — |
| Shape 4 (installed today) | `index.v4.json` | no, left out | unchanged until it updates |
| Shapes 3, 2, 1 | `index.v3.json`, `index.json`, `map.json` | no | unchanged |
| New app offline, only a v4 copy kept | `STORED_OLD` v4 | no | map shown, marked stale |
| Shape 4 if a loop leaked into v4 | — | — | whole map refused (load banner) → hence the publish assertion and the workflow check |

Keep v4 for at least a month after shape 5 ships (the rule in `map-file.ts`).

## 4. Public map (model = slice M, UI = slice D)

**Where #173 lives:**
- `src/features/routes/model/ride.ts`: `rideCut`, `rideSpan`, `rideToEnd`, `spanAlong`, `travelLine`, `rowStops`.
- `model/ride-rows.ts`: `rideRows`, `rowsOutsideRide`.
- `map/use-ride-picks.ts` (pick state) and `map/use-ride-to.ts` (pick, `toEnd`, span, `ridden`).
- `cards/timeline-route-detail.tsx`, `timeline-rail.ts`, `timeline-folds.ts`, `use-timeline-folds.ts`, `timeline-row-role.ts`, `trip-card.tsx` (`pickedFareFor`).
- `ride-carry.ts` is SWITCH-only, so loops don't use it.

**Model interface (slice M, pure; B, C and D code against it):**
- `routes.ts`:
  - `isLoop(v)`, `loopName(signboard, via)`, `LOOP_CLOSED_M = 15`, `isClosedLine(line)`.
  - `ServedRoute.isLoop?`.
  - `nameDirections` and `directionEnds` get loop branches. Today `directionEnds` would split "UP – Ikot" on its dash.
- `direction-schema.ts`: both raw schemas get `head_stop_id`/`tail_stop_id: z.nullable(z.string())` and `is_loop: z.optional(z.boolean())`, with a check that loop ⇔ both ends null. The app side gets `headHotspotId: string | null` and `isLoop: boolean`.
- `timeline.ts`:
  - `listedAlong` admits terminals when `route.isLoop`.
  - `loopRows(along)`: place runs in drawn order.
  - `loopTimeline(along, tipRowId)`: `from = to = tip`, `between` = the rest going round.
  - `loopTip(along, near: LngLat | null, openedFrom: Hotspot | null)`: precedence is openedFrom's place, then nearest box by haversine to `near`, then the first row.
- `ride.ts`:
  - `routeTimeline(..., tipId = null)`.
  - `travelLine` returns the drawn line for a loop.
  - `rideCut` allows terminals on loops.
  - `loopFrom(line, metres)`: the line closed and rotated to start there.
  - `tipLine(v, hotspots, tipId)`.
  - `rideSpan(..., tipId = null)` loop branch: s = start or tip; e = end or tip; forward = ((e−s) mod L), or L when the end is the tip; result `spanAlong(loopFrom(line, s), 0, forward)`. It never runs backwards.
  - `rideToEnd(..., tipId)` on a loop is a ride from the start to the tip.
- `ride-rows.ts`: `rideRows(..., isLoop = false)`. On a loop, endRow `'from'` counts as `'to'`, and an end above the start returns `{ first: startAt, last: endAt, wraps: true }`. `rowsOutsideRide` with wrap is the rows strictly between E and S.
- `departures.ts`:
  - Loops are listed both ways round, each as its own card keyed by its name, with the row `to = LOOP_WORD` ('Ikot', the owner's word).
  - `wayWord` returns `LOOP_WORD` when everything showing is a loop.
  - New `otherWayHasRoutes(directions, back)` ignores loops.

**Card behaviour (functional default; the look is the owner's Figma):**
- Top row (`TimelineTop`) is the tip, marked S.
- The rows follow going round; the bottom row (`TimelineBottomEndRoute`) is the tip again.
- No SWITCH; the header word is `LOOP_WORD` instead of Papunta.
- Before a pick, the tiles show the whole loop's km and fare.
- Tapping a row: the ride runs from the tip forward to it.
- Set as start, then tapping a row above S: E sits above S and the ride wraps. The rail runs lit from the top down to E, breaks, the rows between fold into one fold, breaks again, and runs lit from S down to the bottom. On the map the ride runs from S round to E across the drawn seam, the rest pale, the chevrons forward.
- An end row picked with a start: the ride runs from S round to the tip.
- × Remove as start: the start goes back to the tip.
- The tip is chosen once, when the trip opens, and never moves under the rider.

**D files:**
- `src/features/routes/map/`:
  - New `use-loop-tip.ts`.
  - `use-ride-to.ts`: `opts.tipId`, the loop span, a `toEnd` glide to the tip's dot, and `'from'` treated as `'to'`.
  - `use-card-camera.ts`: an `opts.tipId` pass-through.
  - `use-lit-rides.ts`: a `tipId` param; a loop's Ride line is `tipLine`, with from = to = the tip.
  - `end-titles.tsx`: one circle when from and to are the same hotspot, and none for a lit loop whose trip isn't open.
  - `routes-shown.ts`: `v.reversed === back || isLoop(v)`.
  - `route-taps.ts`: `setBack` ignores loops.
- `cards/`:
  - `trip-card.tsx`: origin and destination labels come from the timeline; `switchable=false`; `isLoop` passed down.
  - `timeline-route-detail-card.tsx` and `timeline-route-detail.tsx`: an `isLoop` prop.
  - `timeline-rail.ts`: `sideOf` handles wraps. The fold rule generalises to: a fold's row sits "by the ride" when either neighbour's side differs from its own rows' side. I checked this gives the same results as today for the linear cases.
  - `timeline-folds.ts` and `use-timeline-folds.ts`: `isLoop`.
  - `route-card-header.tsx`: `way: null` hides SWITCH.
  - `route-card-list.tsx` and `hintuan-card.tsx`: `switchable` via `otherWayHasRoutes`.
  - `use-trip-timeline.ts`: `tipId`.
  - Stories: loop rest, loop wrap ride, loop trip card, a loop row in a list.
- `src/features/locator/commuter-location.tsx`: `onWhere?: (at: LngLat) => void`. It fires on the first fix and then only after a move of more than 50 m, so the page doesn't re-render every second. This complies with ADR 0004: the position never leaves the phone.
- `src/app/public-map/public-map-app.tsx`:
  - `const [commuterAt, setCommuterAt] = useState<LngLat | null>(null)`.
  - `const tipId = useLoopTip(saved.selected, hotspots, { near: commuterAt, openedFrom: hotspots.selected })`.
  - Pass `tipId` to `useCardCamera`, `useLitRides` and `useTripTimeline`.

**Tests:**
- Unit (M): new `tests/unit/loop-test.mjs` covering:
  - rotation, seam and an unclosed line;
  - forward and wrap distances;
  - `rideSpan` and `rideToEnd` on a loop;
  - `loopTimeline` (rotation, terminals included);
  - `loopTip` precedence;
  - `rideRows` wrap;
  - departures listing loops both ways;
  - `nameDirections`;
  - the schema accepting a loop and refusing mixed ends.
- Unit (D): `timeline-rail-test.mjs` (the wrap rail and fold rule), `timeline-route-detail-test.mjs`.
- e2e (D): new `tests/e2e/loop-test.mjs`.
  - **Fixture:** intercept `/\/data\/index\.v\d+\.json$/` and serve the committed index plus a synthetic loop near UP Diliman: 5 hintuan boxes on a closed rectangle, links with sequences, an overview, and `/data/lines/<id>.json`. Build it with the app's own `overviewOf` and `lineFileText`, and stamp it with the schema the page expects.
  - **Checks:**
    - no `card-switch` on the loop's trip;
    - without location, the top row is the first drawn hintuan and the bottom row is the tip;
    - with geolocation granted and LocatorButton tapped near box 3, reopening starts at 3 and the rows wrap (4, 5, 1, 2);
    - opened from box 4's HintuanCard, the tip is 4;
    - tapping 5 gives Distance = forward metres;
    - S on 5 then E on 2 gives a wrapped Distance, one middle fold, and the rail broken below E and above S;
    - the bottom row with a start rides to the tip.
  - After C's path change lands, audit `commuter-test.mjs` and `phone-test.mjs` for picks that assume two directions, and filter loops out.

## 5. Glossary

Use **Loop**:
- "Ikot" is already on CONTEXT.md's _Avoid_ list (under Contribution), and it's a route's name (UP Ikot).
- "Paikot" already means something else in code: `loop-closing.ts` uses it for two-ended routes whose two directions form a circle.
- "Loop" matches "Close the loop" (the same act: end a line where it began), PLAN's "Looping", and `is_loop`.

New CONTEXT.md entries, under Routes:

> **Loop**:
> A route that goes round one way with no ends — `UP – Ikot`. It has one direction, its line closed, and no head, tail, return or SWITCH; every place on it is a stop, a terminal box on it counting as one. It is called by its signboard, which a loop must have. The same streets the other way round are another loop with a signboard of its own — `UP – Toki`.
> _Avoid_: ikot (a loop's name, and a contributor's word), paikot (said of two-ended routes whose two directions make a circle), circular route, ring

> **Tip** (of a loop's trip):
> Where a loop's timeline starts: the hintuan whose card the trip was opened from, else the one nearest the commuter, else the first its line passes as drawn. Not an end: a ride goes on round past it.
> _Avoid_: start (a ride's), head, origin

Amendments to existing entries:
- **Route**: "…— or a loop, which has neither."
- **Direction**: "exactly two; a loop, one."
- **Slot**: "Every route but a loop…"
- **Signboard**: "Optional, except on a loop, which is called by it."
- **Ride**: "On a loop a ride only goes forward, round past the tip if need be."
- **Timeline**: "on a loop, from its tip round to the tip again."

Also add `docs/adr/0005-a-loop-has-no-ends-and-is-named-by-its-signboard.md`, which partly supersedes ADR 0002 for loops, and a note in PLAN.md's M9 section that `is_loop` is on `route` and the tolerance is 15 m.

## 6. Slices (at most 4 builders)

| Slice | Builder | Owns | Depends on | Tests | Done when |
|---|---|---|---|---|---|
| **A Database** | 1 | `supabase/migrations/0021_loops.sql`, `supabase/migrations/README.md`, database.md §10, studio-maps/01 comment; after apply, `src/shared/types/database.types.ts` | nothing (start now) | the owner's rolled-back checks (§1) | SQL safe to run twice; README row says "not yet applied"; after apply: ledger row filled, types regenerated, advisors and §13 audit clean |
| **M Model + words** | 1 (after A's SQL; both are small) | `src/features/routes/model/`, `CONTEXT.md`, `docs/adr/0005-…`, PLAN.md M9 note, `tests/unit/loop-test.mjs`. Exception: it may also touch the few lines elsewhere that break on the nullable-end types (`?? ''` or null guards in `save-panel.tsx` initialisers, `use-save-target.ts`), with no behaviour change, before B/D start | nothing | `loop-test.mjs`; every existing unit test passes **unchanged** | `npm run check` green; two-ended behaviour identical |
| **B Studio** | 2 | `src/features/studio/`, `src/app/studio/`, `tests/e2e/save-test.mjs` (stand-in: ends unique only when non-null, `route_loop_unique`, 23514 rules), unit tests `save-checks`, `route-save`, `route-claim`, `direction-rows`, `loop-closing`, `return-trip`, `route-export` | M merged; A applied and types regenerated (for `data/`); D's `useLoopTip` (workshop wiring, last step) | those, plus save-test's loop flow: close, pre-ticked toggle, signboard refusal, save writes `is_loop`/null ends/one row, no return-trip toast, same-signboard refused, open line refused, Edit keeps the toggle locked | check green; SavePanel stories (new loop, open line, edit) |
| **C Publish** | 3 | `scripts/`, `src/features/routes/published/`, `public/data/` (+ `index.v5.json`), `vite.config.ts`, `.github/workflows/publish-map.yml`, `README.md`, `docs/adr/0001-…`, unit tests `map-file`, `map-data`, `map-file-constants`, new `publish-shapes-test.mjs`; path-only edits to `tests/e2e/{pwa,scale,commuter,phone}-test.mjs` and `lib/big-map.mjs` | M merged; A applied before C reaches main (otherwise the `is_loop` select returns HTTP 400) | `publish-shapes-test` (loops and their links left out of shapes 1–4); `map-data-test` loop rules; `map-file-test` (5 read, 6 refused, STORED_OLD v4 first, committed older shapes = v5 minus loops/lines); pwa-test caches v5 | a publish on today's data rewrites shapes 1–4 byte-identical and writes v5 |
| **D Public card** | 4 | `src/features/routes/cards/`, `src/features/routes/map/`, `src/features/locator/`, `src/app/public-map/`, `tests/unit/timeline-rail-test.mjs`, `timeline-route-detail-test.mjs`, new `tests/e2e/loop-test.mjs`; the loop audit of commuter/phone suites after C | M merged; builds against the fixture, no database needed | as in §4 | check green; stories; loop-test and commuter-test green |

**Order:**
1. **Wave 1:** A and M (builder 1). B, C and D can begin from M's signatures above while M's PR is open, and merge after it.
2. **Wave 2:** B, C and D in parallel.

**Release gate:** loops must not be savable in production before C and D are live, and A must be applied before C ships. Ship A (applied) → C+D → B, or C, D and B in one release.

## 7. Risks and open questions

**Risks:**
1. **Old installed apps.** A loop that leaks into `index.v4.json` blanks every installed app. Guarded three ways: shape 5, the publish's no-loops-in-1–4 assertion, and the workflow checking v4.
2. **Release order.** B on main before C makes the nightly publish fail once a loop is saved. C on main before A is applied makes the publish fail with 400. An editor on an old studio tab gets "Couldn't load saved routes" until they reload.
3. **0018 not yet written.** It must make `route_loop_unique` partial on status too, and its "both ends approved" guard must pass null ends. This is noted in the SQL header and in the studio-maps/01 ticket.
4. **Drawing direction.** A loop has no ends to orient it, so it must be drawn the way the jeeps go. The save panel says so and shows the order; fixing a wrong one means redrawing. "Reverse into a new loop" (handy for UP Toki) is a later feature.
5. **A place passed twice** (out-and-back on one street) gets two rows, but `rideCut` cuts both at the place's last pass. v1 warns in the save panel; M8 pass numbers fix it properly.
6. **Location is opt-in** (LocatorButton). Most commuters will get the hintuan-card tip or the first drawn hintuan.
7. **Terminal links on loops** become automatic, unlike the hand-picked terminal checklist. A terminal box drawn after the loop isn't linked until the loop is saved again.
8. I checked closed lines through `simplifyLine`/`nearestOnSegment`: they handle a zero-length base segment, so the publish's thinning won't break on a loop.

**Questions for the owner** (each has the default above; the look is his Figma):
- **Q1 Words.** The loop's row in lists and its trip-header word in place of Papunta (default "Loop", or "Paikot"/"Ikot"?), and the bottom timeline row (default: the tip's name again).
- **Q2 SWITCH on a loop's trip:** hidden (default) or shown disabled?
- **Q3 Tiles before a pick:** the whole loop's km and fare (default), or blank until an end is picked?
- **Q4 Opened from a hintuan's card:** start the timeline at that hintuan (default) rather than nearest the commuter?

### Critical Files for Implementation
- /home/user/ParaPo/supabase/migrations/0021_loops.sql (new)
- /home/user/ParaPo/src/features/routes/model/ride.ts (with ride-rows.ts, timeline.ts, direction-schema.ts, routes.ts)
- /home/user/ParaPo/scripts/publish/publish-map.mjs (with src/features/routes/published/map-file.ts)
- /home/user/ParaPo/src/features/studio/panels/save-panel.tsx (with save-checks.ts, use-save-facts.ts, data/routes-write.ts)
- /home/user/ParaPo/src/features/routes/map/use-ride-to.ts (with cards/trip-card.tsx, cards/timeline-rail.ts)
## Builders

| Slice | Branch | Builder | Starts from |
|---|---|---|---|
| A database + M model and words | `claude/loops-model` | B | origin/staging |
| B studio | `claude/loops-studio` | E | `claude/loops-model` once its interface commit is pushed |
| C publish | `claude/loops-publish` | C (new) | `claude/loops-model` once its interface commit is pushed |
| D public card | `claude/loops-card` | F | `claude/loops-model` once its interface commit is pushed |

Rules for every slice:
- One PR per slice, base `staging`, draft until its checks pass. Merge commits only: bring `claude/loops-model` or `staging` in with a merge, never a rebase, amend or force-push.
- Nobody writes to the live database. Migrations are written, never applied; the owner applies 0021. save-test's stand-in only.
- Stay in your slice's folders (the table in §6). A change another slice owns is a message to the coordinator, not an edit.
- No new dependency. Comments say why; history goes in commits and PRs.
- Release gate (coordinator): 0021 applied → C and D merged → B merged. Nothing reaches main without the owner.
