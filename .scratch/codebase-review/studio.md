# Codebase review 2026-10-28: The studio and the database

The database is careful: every write needs an editor, and only reviewed work reaches commuters. But a few ways of saving get around the review in practice.
The worst: deleting a direction approves the editor's other unreviewed changes along with it, and editing something a second time quietly throws away the first edit.
The tests mostly check the studio with drafts off, while the live site runs with drafts on. The flaky two-editors test is a wait that never waited.

Reviewed on `origin/staging` at 63406c8. `npm run check` passes there (1,172 unit checks, lint, build guards). The files I read include `src/app/studio/`, all of `src/features/studio/`, `supabase/migrations/` (0005, 0015, 0017, 0018, 0021, 0022, 20261018112757, 20261026090000), `supabase/apply/`, the studio's unit checks and browser suites, and CI run 40536090451's log.

## Findings

### studio-01: Delete on a trip card approves the editor's whole unreviewed route draft

- Severity: bug
- Where: `src/features/studio/panels/use-delete-actions.ts:81-95`, `src/features/studio/data/draft-save.ts:403-408` (`routeDraftState` starts from the draft already kept), `draft-save.ts:519-522` (`deleteDirectionDraft`)
- What happens:
  1. An editor redraws Papunta of route X. It is saved as a draft and waits in Drafts, unreviewed.
  2. Later the same editor presses Delete on Pabalik and confirms "Delete 'X' — Pabalik?".
  3. `deleteDirectionDraft` empties Pabalik *inside the existing draft*, which still holds the Papunta redraw.
  4. The delete then approves that draft in the same press (`runReviewCommand({action:'approve'})`).
  5. The unreviewed redraw goes live, and commuters get it at the next publish.

  The confirm mentions only the delete. Nobody notices until the public map changes.
- Fix: before approving, read `draftOf('route', v.routeId)`. If a draft already exists, store the removal in it but don't approve it, and say "Added to your draft; review it in Drafts". Approve at once only when the delete is the draft's only change.
- Size: S
- Owner decides: yes (changes what Delete does on screen)

### studio-02: With drafts on, Edit and the signboard editor start from the approved version and overwrite the editor's own draft

- Severity: bug
- Where:
  - Edit route opens the line from approved rows: `src/features/studio/drawing/use-follow.ts:97-105` → `data/live.ts:202-223` (`withDrawing`).
  - Its facts come from the approved parent: `panels/save-panel.tsx:83,102-106,221`.
  - Edit hotspot: `panels/hotspot-panel.tsx:249-253`.
  - Signboards: `panels/signboard-editor.tsx:32,41-50` → `data/signboards.ts:32-43` → `data/draft-save.ts:529-535`.
- What happens: the studio's map and cards show approved rows only, but every save is built on top of the draft and replaces parts of it with what the form holds.
  - **Signboards:**
    1. The editor adds board A, which goes into the draft.
    2. They reopen the card later. It lists the approved boards, without A.
    3. They add board B. The draft's list becomes approved + B, and A is gone.
  - **Line:**
    1. The editor redraws Papunta (a draft).
    2. Next day they press Edit to adjust it. The *old approved* line opens.
    3. They save. The draft's redraw is replaced by old line + adjustment.
  - **Facts:** the same happens with Via, Signboard and Fare note after "Edit draft details" in Review, and with a hotspot's name and note.

  The editor notices only if they compare carefully in Review. Usually nobody does.
- Fix: when the signed-in editor has their own draft of the subject, open Edit, the hotspot panel and the signboard editor from the draft's payload (`routeStateFromDraft` already parses it). Until that exists, refuse the card edit with "You have a draft of this; finish or discard it in Drafts".
- Size: M
- Owner decides: yes (what an editor sees when reopening their own work)

### studio-03: Every approval rewrites links, which bumps the neighbours' revisions: false conflicts, and the only way out can drop another editor's links

- Severity: bug
- Where:
  - `supabase/migrations/0022_draft_ops.sql:648-651` (a route approval deletes and re-inserts every link of every direction).
  - `0022_draft_ops.sql:706-709` (a hotspot approval deletes and re-inserts all its links).
  - `0022_draft_ops.sql:207-233` (`route_stop_bumps_subjects` bumps the hotspot's *and* the route's revision on every link insert or delete).
  - `src/features/studio/review/review-conflict.tsx` ("Keep draft for a new review") → `refresh_draft_base` in `20261018112757_reviewed_draft_approval.sql`.
  - Also `scripts/publish/publish-map.mjs:530-551` (a changed revision alone gives the map a new `published_at`).
- What happens:
  1. Editor A renames hintuan H. The hotspot draft carries H's link list as it was that day.
  2. Editor B approves *any* change to route R that passes H, even a fare note. R's links are deleted and re-inserted, and H's revision goes up.
  3. A's draft now answers "Approved data changed".
  4. A's only options are Discard, or tick "I compared both versions" and Keep. Keep resubmits the old link list, and approving it replaces H's links whole.
  5. If B's approval had *added* a link (R newly passes H), Keep drops it. R's timeline loses H on the public map, and nobody notices.

  It works the same the other way round: approving a hotspot bumps every route through it, so every pending route draft through it conflicts.
  The bumps also flood the studio's "waiting for publication" list. And because the publish's `source_revisions` changes, the published map gets a new date even when nothing a commuter sees changed.
- Fix:
  - In `approve_draft`, write only the links that differ: delete the missing ones and insert the new ones. Unchanged links then bump nothing.
  - On a hotspot draft's "Keep", rebuild the hintuan links from the current approved directions (`hotspotLinks`) instead of keeping the frozen list. Keep only the owner-ticked terminal links.
- Size: M
- Owner decides: yes (database)

### studio-04: The save sheet and the account dialogs are not modal; the drawing toolbar stays reachable and Cancel leaves the studio stuck

- Severity: bug
- Where:
  - `src/app/studio/workshop.tsx:478-487`: the DrawToolbar is still rendered and focusable while `isSaving`. Only its keyboard shortcuts are switched off.
  - `workshop.tsx:519-538`; `panels/studio-save-sheets.tsx:52,68`.
  - The panels have no `role="dialog"`, no focus trap and no focus return: `auth/sign-in.tsx:118`, `auth/change-password.tsx:72`, `auth/reset-password.tsx:54`, `panels/save-panel.tsx:244`, `panels/hotspot-panel.tsx:309`.
- What happens:
  1. An editor presses Done, and the save sheet opens.
  2. Shift+Tab from its first field reaches the toolbar behind it.
     - **Undo** changes the line under the form, so Save writes a different line from the one shown.
     - **Cancel** ends the drawing, but `isSaving` stays true. The sheet vanishes, the Drafts button stays hidden (`workshop.tsx:447-451`), and the next "New route" opens the save sheet at once with no points.
  3. Keyboard and screen-reader editors run into this. CLAUDE.md requires focus to be trapped and returned.
- Fix:
  - Put `inert` on the map box while `isSaving || isSigningIn || isChangingPassword || isResetting`.
  - Clear `isSaving` whenever the drawing ends (`!draw.drawing`).
  - Then give the sheets real dialog semantics. A shared dialog component would cover all five.
- Size: S for inert and the reset; M for the dialog semantics
- Owner decides: no

### studio-05: "Close the loop" is offered after Extend → keep the end, and it inserts the start point before the borrowed end

- Severity: bug
- Where: `src/features/studio/drawing/use-loop-closing.ts:136-143` (`ownStart`); `drawing/draw-toolbar.tsx:223`; `drawing/use-drawing.ts:131-139` (`addPoint` goes in ahead of the join).
- What happens:
  1. An editor uses Extend and keeps the borrowed end. The target has no route or direction, so `ownStart` is true, and the toolbar offers "Close the loop" with `closeAt = controlPoints[0]`.
  2. Pressing it adds that point *before* the join, not after the last point:
     - with nothing drawn yet, it duplicates the join point;
     - otherwise it puts the start just ahead of the borrowed end.
  3. The line never closes, so the button stays enabled, and each press adds another stray point.

  The editor sees a wrong line. It reaches commuters only if they save it.
- Fix: make `ownStart` false while `draw.borrow?.part === 'end'`; an extension is never a loop. Pass a copy of the point (as `loopClosingPoint` does), not the stored object.
- Size: S
- Owner decides: no

### studio-06: A follow's line arrives after the drawing has moved on and is joined anyway

- Severity: robustness
- Where: `src/features/studio/drawing/use-follow.ts:86-89,97-105` (awaits a Supabase read, `withDrawing`); `drawing/use-line-borrowing.ts:287-314` (`connect` re-checks only the one-join rule).
- What happens:
  1. On a slow network, an editor right-clicks a saved line, or taps Follow.
  2. Before the line arrives, they keep clicking, press ✕ and start a new route, or open another direction.
  3. When the reply lands, `connect` joins the old line onto whatever is drawn now: from a different last point, onto a new drawing, or onto a saved direction.
  4. After a plain cancel, a confusing "Draw from where the jeep starts first…" notice appears.

  Only the editor notices.
- Fix: before the read, note the last point (and a drawing generation number). In `connect`, refuse if either changed. Set `borrowRef.current` straight away in `connect` rather than in a layout effect.
- Size: S
- Owner decides: no

### studio-07: Saving "Edit draft details" flashes a false "This draft changed" alert, then the form unmounts

- Severity: bug
- Where: `src/features/studio/review/draft-facts-form.tsx:20-36,56-78`; `review/review-details.tsx:38,57`; `data/use-review-query.ts:29-34`.
- What happens:
  1. The editor saves the details. `onSuccess` sets `openedRevision` to the new revision while the `draft` prop still holds the old one.
  2. `isStale` becomes true, so a `role="alert"` "This draft changed while you were editing" is announced and Save disables itself.
  3. When the refetch lands, the comparison query's key changes. The form unmounts to "Loading the approved version…" and focus is lost.
  4. If the refetch fails, the false alert stays. "Load latest draft details" then restores the *pre-save* values at the old revision, and the next save is refused as `revision_mismatch`.

  The editor notices.
- Fix: in `onSuccess`, write `result.draft` into the drafts query (`setQueryData`) instead of comparing against a stale prop. Use `placeholderData: keepPreviousData` on the comparison query.
- Size: S
- Owner decides: no

### studio-08: An editor can rewrite any column of their own draft directly, including the conflict check's base

- Severity: security
- Where: `supabase/migrations/0018_review.sql:333` (`grant ... update on public.draft to authenticated`, all columns); policy `20261026090000_draft_update_own.sql:31-40`.
- What happens: the studio only ever updates `payload`, `status` and `submitted_at` (`data/drafts.ts:128-132`). But anyone holding an editor's session (an old tab, a script, a stolen session) can PATCH the draft over REST:
  - `base_revision` set to the current revision skips the conflict check without the explicit "Keep" step (studio-03);
  - `status` set to `pending` without `submit_draft`;
  - `editor_id` set to null hands the draft to every editor;
  - `subject_id` or `kind` changed points it at another route.

  `approve_draft` trusts these columns. Editors are trusted, so this is defence in depth, but the draft table is the review step's only record.
- Fix: replace the table-wide grant with `grant update (payload, status, submitted_at, note) on public.draft to authenticated`. Drop `editor_id is null` from the policy's `with check`. Do it in the same paste as the not-yet-applied `draft_update_own`.
- Size: S
- Owner decides: yes (database)

### studio-09: Any editor can discard another editor's draft, and the UI offers it on every draft

- Severity: security
- Where: `src/features/studio/review/review-list.tsx:42-47` ("Discard…" on every row); `supabase/migrations/0022_draft_ops.sql:360-382` (`discard_draft` checks only `require_editor`); `draft_delete` policy, `0018_review.sql:330-332`; the spec rule "can look, not change" (`data/draft-lock.ts:3-6`); the migration note "discarding is the 7-day rule's business, which waits on the owner" (`20261026090000_draft_update_own.sql:14-16`).
- What happens:
  1. Editor B opens Drafts, sees Editor A's work in progress, and presses Discard….
  2. A's draft is deleted, and nothing tells A.

  `studio-two-editors-test.mjs:246` even finds B's list item *by* its Discard button, so the suite that asserts "look, not change" relies on B being able to discard. A notices when their work is gone.
- Fix: the owner chooses. Either only the maker discards (hide the button for others, and check `editor_id` in `discard_draft` and in `draft_delete`), or every editor may, and the spec and `draft-lock.ts` say so.
- Size: S
- Owner decides: yes (who may remove another editor's work)

### studio-10: Four separate query caches in one page: a card's "being changed by" lock stays after the draft is gone

- Severity: robustness
- Where:
  - Each of these makes its own `createQueryClient()`: `review/draft-locks-provider.tsx:12`, `review/review-workspace.tsx:11`, `contributors/contributors-workspace.tsx:11`, `public-view/studio-public-view.tsx:18`.
  - The lock is read in `review/use-draft-lock.ts:44-48`.
  - `auth/use-session.ts:9-11` starts every mount at `undefined`.
- What happens:
  1. A trip card says "Being changed by Ana".
  2. The editor opens Drafts over it and approves or discards that draft.
  3. Only the review cache is invalidated, so the card keeps the lock until it is reopened. "Try again" shows only for the "could not check" state.
  4. Separately, each card mount starts with no session, so for a moment `useDraftLock` thinks drafts are off and shows Edit and Delete on another editor's route. The write is still refused by `assertNotAnothersDraft`, so the editor sees a flicker and then a confusing refusal.

  CLAUDE.md asks for one QueryClient.
- Fix: one studio QueryClient at `StudioApp`, keyed by the user, and the session read once and passed down by context. Treat an `undefined` session as "checking" in `useDraftLock`.
- Size: S–M
- Owner decides: no

### studio-11: Called-off router requests keep their place in the queue; snapping stalls for seconds

- Severity: robustness
- Where: `src/features/studio/drawing/snap.ts:53-64` (`takeTurn` books `nextSlot` when called, 1 s apart, and keeps it when aborted); `drawing/gap-resolver.ts:19-20` claims the opposite.
- What happens:
  1. An editor clicks 12 points fast, booking slots now to +12 s.
  2. They press Undo 11 times and click once more.
  3. The new gap waits about 12 s behind requests that will never be sent. "Snapping…" shows and Done stays disabled all that time.

  The editor notices; no data is harmed.
- Fix: hand out turns lazily, from a queue a waiter leaves when it is aborted. Or advance `nextSlot` only when a fetch actually starts. At the least, correct the comment.
- Size: M
- Owner decides: no

### studio-12: Why studio-two-editors-test failed on staging on 2026-10-27: its "routes loaded" wait never waits

- Severity: test
- Where: `tests/e2e/studio-two-editors-test.mjs:134-138` (`waitForFunction` with an *async* predicate), `:160-169` (`tapAt`: `jumpTo` zoom 17, fixed 500 ms sleep, click), `:187`, `:271-272`; `tests/e2e/lib/harness.mjs:93-100` (documents this exact trap); `src/features/routes/map/use-saved-routes.ts:243-250` (the studio fits the map to the routes once, when they first arrive, at most zoom 13).
- What happens: CI run 40536090451 (the merge of #424), job "studio-two-editors-test".
  1. The "No name on file" step timed out at `openRouteFromPlace`: `card-item` was visible, but `<dialog aria-labelledby="studio-review-title">` intercepted every click.
  2. An async predicate returns a Promise, which Playwright counts as true, so `load()` waited only for the map, not the routes.
  3. The routes arrived during `tapAt`'s 500 ms sleep. The one-time fit moved the camera from zoom 17 to 13.
  4. At zoom 13 the tap meant to land about 34 px off the line's end landed about 2 px off it: still inside the place box (the place card opened), but also inside the draft line's invisible hit area (`maps/draft-lines.tsx:47-58,73-83`), which opened the Drafts dialog over it.

  #424 changed no studio code; it only ran the suite into an existing race. The step at `:227` has the same exposure.
- Fix: in `load()`, use `waitForSource(page, 'saved-routes', 30000)` from `lib/harness.mjs`. In `tapAt`, replace the 500 ms sleep with a wait until `__map.getZoom()` equals the zoom asked for.
- Size: S
- Owner decides: no

### studio-13: The browser suites test the save path production doesn't use

- Severity: test
- Where: `.github/workflows/ci.yml:196,281,344` set `VITE_STUDIO_DRAFTS=0`; only `:290` (two-editors, public-view) sets 1. `.env.production` has `VITE_STUDIO_DRAFTS=1`.
- What happens: with drafts off, these suites test direct writes to the approved rows, which the live studio never makes since drafts went on:
  - save-test (2,345 lines);
  - hotspot, extend, group, snap and studio-phone.

  The live path is untested in a browser: every save as a draft (`draft-save.ts`), Delete as draft-and-approve (studio-01), signboards into a draft (studio-02), and take-down. Bugs like studio-01 and studio-02 sail through. `tests/unit/draft-save-test.mjs:127` asserts `STUDIO_DRAFTS === false`, which only checks that the unit runner has no env.
- Fix: run save-test's core flows (new route, edit, delete, signboards, hotspot) a second time with drafts on, against a fake that keeps drafts. Then retire the drafts-off copies once the owner retires the flag.
- Size: M–L
- Owner decides: no

### studio-14: The review flow never runs in a browser in CI, and the fake database answers unknown RPCs as a phone block

- Severity: test
- Where: `tests/e2e/review-test.mjs`, `review-publication-test.mjs`, `review-route-picker-test.mjs` and `review-demo-test.mjs` need the loopback preview with a disposable Postgres (`scripts/preview/README.md`), and no workflow runs them. In `tests/e2e/fixtures/fake-studio-db.mjs:174-217`, any RPC the fake does not implement falls through to the phone-block branch and answers 404 `no_contributor`; the unimplemented ones include `submit_draft`, `send_back_draft`, `approve_reviewed_draft`, `refresh_draft_base` and `take_down`.
- What happens: nothing in CI presses Approve, Send back or Keep draft against real SQL. A suite that did press them against the fake would get a misleading `no_contributor`. Unit checks (`review-flow`, `draft-review`) cover only how the client reads the answers. The SQL in 0022 and 20261018112757 is proven only by `supabase/verify/`, by hand.
- Fix: make the fake throw "unknown rpc <name>" for anything it doesn't implement. Add a CI job that runs the preview (Postgres service container) with review-test and review-publication-test.
- Size: M
- Owner decides: no

### studio-15: Two checks in the two-editors suite cannot fail

- Severity: test
- Where: `tests/e2e/studio-two-editors-test.mjs:216-221` and `:340-361`.
- What happens:
  - "The approved route is untouched" compares `route_variant.updated_at` with the seed's `NOW`. The app never sends `updated_at`, and the fake has no touch trigger, so a save that wrote the approved row *and* the draft still passes.
  - "B's direct update is refused" tests the fake's JavaScript copy of the policy (`fake-studio-db.mjs:268`), not the database. Its `.catch(() => null)` plus `direct === null ||` passes even when the request itself fails.
  - The fake's `claim_draft` skips `require_editor` and `payload_ok`, so seeded `{version:1}` payloads that the real function refuses are accepted.
- Fix:
  - Assert that `db.log` shows no POST, PATCH or DELETE on `route`, `route_variant`, `route_stop` or `stop` during A's save.
  - Drop the `null` branch.
  - Move the real policy check into review-publication-test (studio-14).
- Size: S
- Owner decides: no

### studio-16: The generated database types are stale, hidden behind `as never`; the studio reads env without Zod

- Severity: standard
- Where:
  - `src/shared/types/database.types.ts` has no `approve_reviewed_draft` or `refresh_draft_base`, though both have been live since 2026-10-20 (migrations README).
  - `src/features/studio/data/drafts.ts:32` (`client.rpc(fn as never, args as never)` for every review call).
  - `data/contributions-write.ts:56-59` (a TODO saying `contribution_use` is not in the types; it is now, at line 121).
  - `data/supabase.ts:8-9` (`import.meta.env.VITE_SUPABASE_URL as string | undefined`; CLAUDE.md says env is parsed with Zod in `features/studio/data/env.ts`).
- What happens: a renamed or retyped RPC argument compiles and fails only at run time, on the editor's Approve. CLAUDE.md asks for types regenerated after every migration, and no `as` to silence errors. Nobody notices yet.
- Fix: regenerate the types. Type `callReview` by `keyof Database['public']['Functions']` and drop the casts. Use the typed client in contributions-write. Move the URL and key into `data/env.ts` with Zod.
- Size: S
- Owner decides: no

### studio-17: The drawing kept on the device and the router's replies are read without validation

- Severity: standard
- Where: `src/features/studio/drawing/draft.ts:69` (`JSON.parse(raw) as StoredDraft`, only `controlPoints` checked), `:98` (`saved.map` inside the restore effect at `use-drawing.ts:382-403`); `drawing/snap.ts:107-111` (`legs as OsrmLeg[]`); `drawing/use-draw-rendering.ts:50-63` (five `as GeoJSONSource`, where the `isGeoJSON` guard in `use-loop-closing.ts` already exists).
- What happens: a stored drawing whose `segments` is not an array (an older build, a hand edit, a half-written save) throws inside the restore effect. The studio then fails on every load until site data is cleared. This is plausible rather than seen. CLAUDE.md requires Zod for localStorage and API data. The editor would notice, with no way out.
- Fix: a Zod schema for the stored drawing (drop it with a notice when it fails) and one for the OSRM reply. Use the existing guard instead of the casts.
- Size: M
- Owner decides: no

### studio-18: Raw codes and server messages reach editors; inline query keys

- Severity: standard
- Where:
  - `review/review-subjects.tsx:40` ("No change was made (${result.code})").
  - `data/draft-save.ts:608` and `data/review-commands.ts:63` ("(${code})").
  - `auth/sign-in.tsx:69` and `auth/change-password.tsx:56,64` (Supabase's English messages passed through).
  - Inline keys `[...contributionKeys.all, 'list' | 'phone']` at `data/use-contributions-query.ts:40-41,52`.
  - Nested ternaries in JSX at `panels/save-panel.tsx:247-255,334-340` and `src/app/studio/workshop.tsx:299-310`.
- What happens: an editor sees "Nothing was saved (direction_elsewhere)" or a Supabase rate-limit sentence, which doesn't say what to do (CLAUDE.md, Errors). A changed key shape silently stops invalidating.
- Fix: map the remaining codes to sentences (the lists in `draftRefusal` and `reviewMessage` nearly cover them), and translate the few Supabase auth errors that matter (rate limit, captcha). Add `contributionKeys.lists()` and `contributionKeys.phone()`. Swap the ternaries for early returns or a lookup.
- Size: S
- Owner decides: no (wording is the owner's only where a sentence is new on screen)

### studio-19: The studio's direction list pages by a column that changes while it pages

- Severity: robustness
- Where: `src/features/studio/data/live.ts:110-115` (`order('updated_at', desc).order('id')`, pages fetched together after the first, `read-all.ts:52-63`).
- What happens: once directions pass 1,000 (the scale the paging is for), a direction updated or approved between the first page and the rest jumps to the top of the order. One row is then read twice and another not at all. That route is missing from that editor's map until reload. Hotspots and links page by columns that never change, so they are safe. The editor notices a missing route, rarely.
- Fix: order the read by `id` alone (the list is re-sorted in memory anyway), as `listHotspotLinks` does.
- Size: S
- Owner decides: no

### studio-20: Five studio files are three to four times the size limit, each with several jobs

- Severity: simplification
- Where:
  - `src/features/studio/data/draft-save.ts` (610 lines): payload builders, reads, writes, refusal wording.
  - `src/app/studio/workshop.tsx` (542): the Playground overlay at 313-503 is a component of its own.
  - `drawing/use-drawing.ts` (508): the five start modes each repeat reset, `setFreehand`, `setArea`, `setTarget` and `setDrawing`.
  - `panels/save-panel.tsx` (433).
  - `data/routes-write.ts` (365): the drafts-off path, dead in production while the flag is on.
- What happens: the bugs above (studio-01, -02, -04) sit where these files mix concerns. Nobody notices until the next change goes wrong.
- Fix: split `draft-save.ts` into the pure state builders, the reads and the store. Lift the Playground overlay out of `workshop.tsx`. Give `use-drawing.ts` one `begin({ area, target, points, segments })`. Decide with the owner when the drafts-off path (`routes-write.ts`, `save-route.ts`, the `STUDIO_DRAFTS` branches) can go.
- Size: L
- Owner decides: no (yes for retiring the drafts-off path)

## What is good

- The database refuses before the studio does. Every write needs `private.is_editor()`, `anon` has no writes and new tables fail closed (0005, 0017), and each security-definer function pins `search_path` and revokes `PUBLIC`. Keep this as the template.
- 0022's lock order (draft, then routes by id, then hotspots by id), with `deadlock-0022.sh` proving the deadlock it prevents, is careful concurrent SQL.
- `read-all.ts` pages every table read and says why; it fixed a real silent-truncation bug.
- The signboards are cleaned twice: in the studio before upload, and again by the publish before they land on the map's own domain (`publish-map.mjs:214-231`).
- `supabase/apply/` gives the owner a paste-once, check-after, revert file for every migration, with ledger rows, so nothing is applied by a session.

## Outside my area

- The publish gives the map a new `published_at` when only `source_revisions` changed (`scripts/publish/publish-map.mjs:545-549`), so installed apps may be told of an update with nothing new to see (amplified by studio-03).
- The drawing suites in CI retry a failed suite once after 60 s (`ci.yml` ~356-366) and don't flag the retry, which hides flakes like studio-12.
