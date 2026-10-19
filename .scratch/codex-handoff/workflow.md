# ParaPo workflow handoff

Updated: 2026-10-19. Current milestone (owner, 2026-10-19), and ONLY this: **save a recording on the phone → upload it → view it in the studio's Contributors map/list → delete it.** Not publishing, approval of contributions, conversion into drafts, backups or a redesign. Sections below "Contributor uploads milestone" are history.

## Release facts that supersede the older branch instructions below

- #275, #281 (draft/review UI and its stack) merged into staging; #282 the same into main. Staging `e010f61` (unchanged on 2026-10-19), tree `edda779`. Main moved on to `ac285a5`, the nightly "Publish map" commit.
- New work branches from **current staging**. Do not resume from `devin/draft-ops` / `devin/review-0018`. Open PRs #274 and #279 are stale stacks of work already merged through #281.
- Only the owner merges staging and main.
- `STUDIO_DRAFTS` stays OFF on deployed builds. `20261018112757_reviewed_draft_approval.sql` was **not applied live** at the last verified checkpoint. 0018, 0021, 0022 are live: never reapply.

## Contributor uploads milestone — 2026-10-19 (Claude session)

PRs (all draft, target staging through the stack; nothing merged, nothing applied live, no Auth setting changed):

| PR | Branch @ head | Base | What |
| --- | --- | --- | --- |
| [#283](https://github.com/Roviicc/ParaPo/pull/283) | `claude/publish-test-source-revisions` @ `3111388` | staging | Test-only fix: main's nightly CI (run 39173347122) failed `publish-shapes-test` after the first real publish wrote `source_revisions`. CI green |
| [#284](https://github.com/Roviicc/ParaPo/pull/284) | `claude/contribution-upload-db` @ `6168e20` | staging | Migration `20261019125900_contributions.sql` (the planned "0019"), apply/check/revert package, verify scripts, types. CI green |
| [#285](https://github.com/Roviicc/ParaPo/pull/285) | `claude/contribution-upload-phone` @ `feb795c` | #284 | Phone upload: status, retry, Remove upload vs Delete from phone, `VITE_CONTRIBUTIONS` flag |
| [#286](https://github.com/Roviicc/ParaPo/pull/286) | `claude/contribution-studio-view` @ `3891446` | #285 | Studio Contributors map + list + detail, isolated preview tooling |
| [#287](https://github.com/Roviicc/ParaPo/pull/287) | `claude/contribution-editor-delete` | #286 | Editors delete an upload in the studio. **Owner approved 2026-10-19: editors may hide and delete** |
| [#289](https://github.com/Roviicc/ParaPo/pull/289) | `claude/contribution-hide` | #287 | Editors hide an upload with a note, Show hidden, Show again. Its `supabase/apply/` holds the complete migration: tables, delete, hide, row security on every `point_batch` piece (10 check rows) |
| [#290](https://github.com/Roviicc/ParaPo/pull/290) | `claude/turnstile` | staging | Shared Turnstile widget; Studio Sign in, Forgot password, Change password carry a token; turnstile-test 7/0. Merge before CAPTCHA is turned on |
| [#291](https://github.com/Roviicc/ParaPo/pull/291) | `claude/contribution-turnstile` | #289 (+ merges #290) | Turnstile before the phone's first upload; upload-test 30/0 with and without a key |

Design as built:
- **Tables (not applied):** `contributor`, `contribution`, `point_batch` (monthly pieces to 2028-12 + default), `hinto`.
- **`save_contribution(jsonb)`:** invoker, one transaction. A resend answers `already saved`, checked *before* the insert so the day-cap trigger never counts a resend.
- **Caps** in triggers: 150 km/h, PH box, time order, 14,400 points, 2,000 hintos, 20/day, 6 h.
- **Row security:**
  - phone: inserts and reads its own contributions and contributor row; deletes its own contributions
  - editors: read (and delete, with #287)
  - anon: nothing
- **Deferred:** `contribution_use`, hide/block writes, retention, dropping `gps_session`.
- **Phone:**
  - **Client and sign-in.** Own client under `parapo.contributor-auth`, loaded only on first upload or removal; anonymous sign-in on first use.
  - **Packing.** `pack-recording.ts` drops fixes the DB would refuse.
  - **When it sends.** Auto-send on save/open; retry on online/visible; Try again; one send per recording in flight.
  - **Local copy.** Never deleted by an upload; Remove upload (server copy, from the identity that made it only) is separate from Delete from phone, with different confirmation wording.
- **Studio:**
  - bounded reader (7/30/90 days, newest 500); TanStack Query; map and list from one query
  - opened upload shows its whole trail and hintos
  - with #287, Delete upload; the phone then reads "Removed from ParaPo by an editor"
- **`VITE_CONTRIBUTIONS`** (default off): every deployed build, including Cloudflare branch previews built from `.env.production`, makes no contributions request and keeps the Contributors placeholder.
- **Build:**
  - Supabase and TanStack Query get their own chunk groups; `shared` never takes studio or contribute modules. Without this, the client and studio code had reached the public page's shared chunk; `check-build` caught it.
  - Contribute page budget: opens at 16.5 kB of its own (≤30); upload chunk on demand 53 kB (≤60, new).

Verification (exact):
- **Disposable Postgres 17** (`public.ecr.aws/docker/library/postgres:17`; Docker Hub rate-limited this container): full `supabase/verify/run.sh` passed, now ending with `contributions.sh`. It covers:
  - apply twice (the second stops whole); 9-row check all `t`
  - `after-contributions.sql`; `contributions-race.sh` (two concurrent sends → `saved` / `already saved`, one row)
  - `contributions-pack.sh` (rides packed by the phone's code, with jumps, repeats and out-of-country fixes, saved whole)
  - revert: refused over data; schema round-trip; re-apply
  - negative controls: the speed check removed, point reads opened, phone reads opened, hidden stamp removed, packer speed filter off; each fails as expected.
- **`npm run check`:** 987 unit tests (#285) and 990 (#286/#287). Storybook builds.
- **Browser suites:**
  - `upload-test` (new, in CI): 27/0 on #285, 28/0 with #287
  - `contribute-test`: 81/0 (now routes `*.supabase.co` to an in-memory stand-in)
  - `contributions-preview-test` (new, local only, needs Docker): 23/0 on the isolated preview (real SQL, real PostgREST v12.2.3, auth stand-in)
- **CI:** #283 and #284 green; #285 green on every finished job including save-test, contribute-test, upload-test.
- **Local `save-test` is not reliable in a Claude container:** unmodified staging crashed at a flaky step after 82 passes (an older pre-installed Chromium than the pinned Playwright, shared CPU). Use CI or the owner's PC.

Blockers and configuration still needed (owner):
1. ~~Decide #287~~: decided 2026-10-19, editors hide and delete (#287, #289).
2. **Apply** `supabase/apply/20261019125900_contributions_apply.sql` **from #289's branch** (`claude/contribution-hide`), then `_check.sql` (10 rows `t`). The SQL editor's first attempt warned that `point_batch_default` had no row security; the owner cancelled it, and every piece now enables it. Regenerate the classic types and record the ledger version in `supabase/migrations/README.md`. The reviewed-draft migration is a separate decision.
3. **Supabase Auth:** turn on anonymous sign-ins; CAPTCHA (Turnstile) only after the Turnstile PR ships for the studio's sign-in, reset, invite password and change-password (`signInWithPassword`) and the phone's first upload. The Turnstile PRs are #290 (studio) and #291 (phone).
4. **Turnstile keys:** a site key as `VITE_TURNSTILE_SITE_KEY` (public, `.env.production` or build env) and the secret in Supabase Auth settings only. Never in chat or the repo.
5. **Turn uploads on** with `VITE_CONTRIBUTIONS=1` in the deploy's build, only after items 2–4.
6. **No shareable live preview link yet.** The isolated preview runs on loopback (`scripts/preview/README.md`, "Contributions"). A hosted one needs either Cloudflare access for a static sample build, or a disposable Supabase branch (paid), so the owner must choose.

Next: owner merges the stack and #290, applies the migration (item 2), turns on anonymous sign-ins, adds the Turnstile keys and CAPTCHA (items 3–4), then `VITE_CONTRIBUTIONS=1` on staging; then a signed-in check on the real project.


## Verified baseline (2026-10-18, historical)

- Local `staging` and fetched `origin/staging`: `80f5e4f0e960713ad7da528e8efeb6ddb3f2635e` (merge #272, save-test race fix).
- Fetched `origin/claude/loops-studio`: `c80a1f81519f52f84dfb83ad259899401daf741c`.
- #271 (Ikot card) and #272 are merged into staging. User reports staging drawing, Ikot, and save suites passed.
- Connected Supabase inspection verified migration 0021 at ledger version `20261018020203` and `route.is_loop` present. Types were regenerated from the live schema, including nullable route ends.
- Completion branch: `codex/ikot-studio-completion`, based on the unmodified `claude/loops-studio` head above. Includes generated types, the applied migration ledger entry, and a fix preserving an existing two-ended route's type when an edited line closes. Regression added to `save-test`.
- Historical contributor PRs to reconcile: #249 recorder, #258 recording rules, #262 screens/map. Do not duplicate their work. Current local staging has no contributor app.

## Owner decisions and working rules

- Recorder **must include a map**. Use existing #262 direction when reconciling work.
- Owner owns design; screenshots replace Figma references for now. Batch unresolved design questions.
- Cheap-phone testing is **not a release blocker**. Browser checks and owner's phone are the initial validation path.
- Use a small parallel team for independent work, separate folder ownership, concise briefs and persistent handoffs. One browser suite at a time.
- Only owner merges into `staging` and `main`. Prepare reviewable changes and evidence first.
- Another Claude/hub session may still be active; confirm current branch ownership before overlapping edits.
- Read `.claude/CLAUDE.md` and `docs/agents/how-we-work.md` before implementation. Do not add dependencies without asking.

## Implemented; reconcile stale tickets

- [x] Contributor plan approval, ADRs/glossary/standards (`contribute/02`, `/03`).
- [x] Typed studio client/generated types, ledger/index cleanup (`/05`); default-grant closure, migration 0017 (`/06`).
- [x] Published reader moved to `src/features/routes/published/` (`studio-maps/03`, ticket stale).
- [x] Contributors / Playground / Public URL switch, Playground default (`studio-maps/04`, ticket stale).
- Contributors and Public are still explicit placeholders. Playground writes live rows directly. Local drawing persistence is not database review drafts.
- Approved decisions in `contribute/issues/02`: reader option A, Playground default, seven-day stale-draft discard, recommended database design/caps. Studio spec's open-decision wording is stale.

## Current PR batch (status 2026-10-18; owner merges, nothing applied live)

Merge order: #273 → #274 (stacked); #275 any time; #276 → #277 → #278 (stacked). Merging #276 lands #249, #258 and #262 at once; close those three afterwards rather than merging them.

| PR | Branch @ head | Base | CI on head | Review |
| --- | --- | --- | --- | --- |
| [#273](https://github.com/Roviicc/ParaPo/pull/273) Ikot studio | `devin/ikot-completion` @ `b2b1101` | staging | all passed except `scale-test` (timing, see below) | no comments |
| [#274](https://github.com/Roviicc/ParaPo/pull/274) migration 0018 | `devin/review-0018` @ this commit | #273 | all passed on `5bceacc` | no comments |
| [#275](https://github.com/Roviicc/ParaPo/pull/275) publish guard | `devin/publish-guard` @ `19ef8b7` | staging | all passed | no comments |
| [#276](https://github.com/Roviicc/ParaPo/pull/276) recorder reconcile | `devin/contribute-reconcile` @ `f255416` | staging | all passed | 6 bot findings: 5 fixed in #277 (resolved), 1 open by design (saved rides after reload) |
| [#277](https://github.com/Roviicc/ParaPo/pull/277) recorder durability | `devin/recorder-durability` @ `ab606f0` | #276 | 17 passed, 0 failed, 1 skipped (`The drawing suites`, path filter) | 3 bot findings fixed in `02bcbc4` (resolved) |
| [#278](https://github.com/Roviicc/ParaPo/pull/278) saved recordings list | `devin/saved-rides` @ `bbccb09` | #277 | pending | new; contribute-test 80/0 locally |

Tests run for this batch, by head:
- `b2b1101` (#273): `npm run check` (854 unit), Storybook build, save-test 148/0, gate-test 17/0, loop-test 35/0. The six live-router drawing suites were not run.
- `5bceacc` (#274): `supabase/verify/run.sh` on Docker postgres:17: every migration in ledger order, 0018 applied twice over existing rows, role/RLS/uniqueness/guard/takedown/revision/draft assertions, approve-vs-take-down race in both orders. Real Supabase/PostgREST behaviour is untested until the live apply.
- `19ef8b7` (#275): `npm run check`; shrink-guard 9/9, privacy-probe 4/4, map-data field check; a by-hand read-only publish against live matched staging's output apart from `published_at`, and a rerun was byte-identical.
- `f255416` (#276): CI contribute-test 62/0, phone-test 144/0, and every other suite passed.
- `ab606f0` (#277): `npx tsc -b`, ESLint, `npm run check`, ride-recording unit 51/51, contribute-test 74/0 locally and in CI. New browser cases: fix writes refused then rewritten on save; a refused recording write stays on the form and is retried; a tap and the timeout saving together save once; a second tab cannot resume or start; the wake lock is requested once while pending and released on Stop. Background time with fixes still arriving is the unit case "the page hidden while fixes kept coming is recorded time, not lost".

#273 `scale-test`: one threshold failed in CI run 39093331085, job 117574532352: "the main thread is busy under 5 s while opening: 5.6 s in long tasks" (map load 5.6 s). The same check on the same frontend code: #274 CI 2.4 s (its only difference from #273 is under `supabase/` plus this file), #275 2.0 s, #276 3.0 s, #277 3.7 s, staging (`80f5e4f`, job 117461621268) 4.0 s. Locally, three runs each: #273 1.9/2.7/2.7 s, staging 1.9/2.1/2.2 s. No regression measured; the CI variance on unchanged code is 2.0–5.6 s. Not fixed and the assertion not loosened. A re-run of the failed job (owner, or any new push to #273) is the remaining check.

Blockers and owner decisions:
- 0018 is APPLIED live (ledger `20261018054405`, applied by Codex with the prepared `supabase/apply/` package; all 13 `0018_check.sql` rows true; anon counts unchanged: 10 routes / 20 directions / 103 hotspots / 256 links; `draft`/`takedown`/`editor_name` return 401 to anon; revert not run — verified independently over REST on 2026-10-18). Do not reapply 0018 or 0021. Types regenerated in `src/shared/types/database.types.ts`; ledger row recorded in `supabase/migrations/README.md`. Merging #274's SQL is a separate step.
- Saved rides after a reload: owner chose an interim list now (#278: Ready screen lists saved recordings, each with Download; reads only). Owner will supply the screenshot; at `contribute/13` extend each row with upload status rather than replacing the list.
- A failed write of the recording itself shows the "could not keep" banner and keeps the form so Continue can retry. The form's download appears only when fixes were lost, which is current design.

Remaining tasks toward record → save locally → upload → studio review → draft → approve → publish → public map: items 4–9 below. Batch 4 needs 0018 applied and the types regenerated. Contributor upload (item 7) needs 0018, then migration 0019, Turnstile keys and Supabase CAPTCHA/anonymous-auth settings (owner).

Next recommended batch: Batch 4 — Playground drafts/review/approve/send-back/take-down/put-back + the real studio Public view (draft saves leave approved rows unchanged; approval detects concurrent edits via `revision`, completes atomically or leaves approved data unchanged; signboard and deletion paths included; studio route recovery filters `status = 'approved'`). Backend first; collect owner screenshot requests for missing screens in one batch.

## Dependency checklist

1. [x] Ikot completion: branch `devin/ikot-completion`, draft PR #273 into staging (Devin session, 2026-10-18). Fresh on that head: `npm run check` 854 unit tests passed; Storybook build passed; save-test 148/0; gate-test 17/0; loop-test 35/0. The six live-router drawing suites were not run. Owner merge pending.
2. [x] Migration 0018 prepared, **not applied**: branch `devin/review-0018` (stacked on #273). `supabase/migrations/0018_review.sql` adds status/status_at/revision on route and stop (route.revision also bumped by every direction write, the complete conflict version), stop.updated_at, approved-only partial uniqueness (route ends, loops, terminals), the two guards (FOR SHARE on ends; safe in both race orders), draft / takedown (trigger-written) / editor_name, approved-only reads for anon and non-editors. Checked by `supabase/verify/run.sh` on Docker postgres:17: all migrations in ledger order, applied twice over existing rows, every assertion and both race orders passed. APPLIED live by Codex on 2026-10-18 (ledger `20261018054405`); 13/13 checks true, anon reads unchanged, private tables 401. Types regenerated; ledger row in README. Studio route recovery (`claimExistingRoute`, `claimExistingLoop`) must filter `status = 'approved'` — Batch 4.
3. [x] Publish protections: branch `devin/publish-guard` @ `19ef8b7`, draft PR #275 into staging (independent of 0018). `shrinkGuard.mjs` (takedowns in force don't count; unexplained loss still fails), `privacyProbe.mjs` (seven private tables, anon `limit=1`), contributor-field check in `check-map-data.mjs`. `npm run check` passed; new unit tests 9/9 + 4/4 + 1; a by-hand publish against live matched staging's output apart from `published_at`, and a rerun was byte-identical. #273's CI `scale-test` failed one timing threshold (5.6 s vs 5 s); the same frontend passed it on #274's CI and locally (2.5 s). Next: Batch 5 reconciliation of #249/#258/#262 (Batch 4 waits for 0018 to be applied and the types regenerated).
4. [ ] Playground drafts/review (`/05`, `/06`): versioned schemas, draft ownership/overlay, save/discard, submit/approve/send-back, conflict handling, retry-safe link updates, take-down/put-back.
5. [ ] Studio Public view (`/07`): published data, read-only view, waiting-for-publish list and actions.
6. [ ] In parallel where ownership permits: (done: recorder PRs reconciled in #276/#277); implement Turnstile studio auth (`contribute/07`), packing/rules (`/10`), offline shell (`/11`), approved screenshot screens (`/12`).
7. [ ] Contributor DB/auth/upload (`/08`, `/09`, `/13`): migration 0019 after 0018, isolated auth storage, anonymous first save, idempotent retry/upload/delete, studio-session isolation.
8. [ ] Contributors studio reader/view/actions (`studio-maps/08`, `/09`): bounded queries, list/map parity, use-line draft, hinto-to-hotspot, hide/block, provenance.
9. [ ] Backup/restore (`contribute/15`, migration 0020) and public contributor entry point (`/14`) after owner release/design decisions.

## Configuration and design dependencies

- Turnstile production/preview widget/site key; Supabase CAPTCHA secret/settings; anonymous sign-in and possible signup hook. Studio auth integration must ship before enabling project-wide CAPTCHA.
- Include `auth/change-password.tsx` current-password `signInWithPassword` call in CAPTCHA work; ticket currently names only sign-in/reset.
- Editor display names; approved references for missing recorder/review/contributor states.
- Backup: R2 bucket/lifecycle/scoped credentials, encryption public key, backup-reader connection secret, restore verification.
- Public contributor button ticket retains owner go/end-test-period and privacy-check dependencies. Do not expand these into blockers for private preview work.

## Verification and resumption

- (Resolved: Devin published the branches.) Earlier, publishing was blocked: the Roviicc GitHub connector returned 403 (`Resource not accessible by integration`) on creating the completion tree. Terminal Git authenticated as `jsonrls` and the new-branch push was denied (403). No remote branch or PR was created. Restore write access for the intended Roviicc account before publishing; do not overwrite the original Claude branch.
- Inventory and review used two focused agents; the coordinator integrated changes and ran verification.
- `npm run check` and Storybook build passed. `save-test`: 148/0 using only its in-memory Supabase stand-in. `gate-test`: 17/0 with `PARAPO_NODE_FETCH=1 NODE_USE_ENV_PROXY=1`. No live data writes or schema changes were made. The six live-router drawing suites were not rerun on this completion branch; staging's earlier results do not establish their result here.
- Local setup: `npm ci --cache /tmp/parapo-npm-cache`; gitignored `.env.local` copied from the repository's public `.env.production`; Playwright headless Chromium installed under `/tmp/parapo-browsers`. Tests requiring local sockets need network permission in this sandbox.
- Detailed next-batch risks and implementation order: [review-workflow-plan.md](review-workflow-plan.md).
- Recheck branch heads and active session ownership first. Inspect existing PRs before implementing missing code.
- Before pushes: `npm run check` and browser suites reached by the change. Record exact commit, checks, failures, blockers and next action here after each batch.

## 0022_draft_ops (Batch 4, first piece) — 2026-10-18
- Branch: `devin/draft-ops` (on `devin/review-0018`), commits `457f375`, `4481c96`.
- Adds review RPCs, editor-only, security definer, jsonb codes: `claim_draft`, `submit_draft`, `send_back_draft`, `discard_draft`, `approve_draft`, `take_down`, `put_back`.
- approve_draft: FOR UPDATE draft lock → subject row lock → `base_revision` vs `revision` conflict → atomic payload apply (route facts + full direction set + per-direction link replacement + emptied-direction borrow cleanup / stop + link replacement) → delete draft → `{"code":"approved"}`. Retry after lost response → `no_draft`. Unique/guard violations map to `ends_taken`, `loop_taken`, `terminal_place_taken`, `direction_clash`, `blocked`, `refused`.
- Payload v1: `{version:1, route:{...}, directions:[{id,...,links:[{stop_id,stop_sequence}]}]}` or `{version:1, stop:{...}, links:[{route_variant_id,stop_sequence}]}`.
- Verified on disposable `pg18`: apply script runs twice cleanly; `0022_check.sql` all `t`. Manual exercise: hotspot draft submitted→approved→row visible→retry `no_draft`; edit draft on concurrent change → `conflict` with `current_revision`; refusal leaves draft pending and subject unchanged; `take_down`/`put_back` codes and takedown logging work.
- NOT applied live — owner applies `supabase/apply/0022_apply.sql` in SQL editor, then `0022_check.sql`.
- Next: studio draft contract (data layer), save-path rewiring through drafts, review UI, Public view.

## 0022 review fixes (commit 961ddb4) — 2026-10-18
Devin Review findings on #279, all fixed and re-verified on disposable pg18:
- `route_stop_bumps_subjects` trigger bumps stop.revision + route.revision on link writes → link edits after drafting now yield `conflict`.
- All-emptied directions ⇒ route goes `taken_down` (logged), not approved-empty.
- `claim_draft` validates payload shape (version==1, route/stop object, directions/links arrays); approve catches cast errors → `bad_payload`; jsonb `null` normalized to SQL NULL via `nullif` (shape/overview/area/point).
- `discard_draft` locks `FOR UPDATE`.
All 5 threads replied; apply script rebuilt + re-run idempotent; `0022_check.sql` all pass.

## 0022 CI fix (commit 53e578f) — 2026-10-18
- studio-suite timeout 15→25 min (save-test needs ~14:15; slow-runner cancels kept failing "The editor"). Same flake caused #274's red.
- #279 CI fully green on `53e578f` (16 passed, drawing suites skipped). Devin Review threads all answered/resolved.
- Next: studio drafts.ts + save rewiring; UI awaits owner's screenshot batch.

## Recorders merged; 0022 green — 2026-10-18
- #276, #277, #278 merged to staging by owner. #278 base retargeted to staging before merge.
- #279 (`devin/draft-ops` @ `9a5cca3`): CI fully green; drafts.ts data layer added (typed RPC callers + payload v1 builders + listDrafts/draftOf); zod/mini fix; 2 late Devin Review flags on merged #278 answered (same-minute labels + missing story → handled in outbox pass).
- Next: wire saves through drafts (needs 0022 live first), review UI, Public view — screenshots pending from owner.

## 0022 scripted verification (commit 9f3b275) — 2026-10-18
- `supabase/verify/after-0022.sql` + `run.sh`: the manual container checks are now a repeatable script. `run.sh` checks `0022_apply.sql` carries the migration unchanged, applies it twice, requires `0022_check.sql` all `t`, then runs `after-0022.sql`.
- Covers: anon / non-editor refused; `bad_payload` at claim; draft saves leave `route`/`stop` untouched; hotspot + loop route (direction, signboards, links) approved, retry `no_draft`; link changed after drafting → `conflict`, route and pending draft unchanged; stale send-back/discard → `revision_mismatch`; every direction emptied → route `taken_down` + takedown row; put back / take down refuse repeats.
- Result on 9f3b275 (disposable pg18): full `run.sh` passed. Negative control: flipping the conflict expectation makes the run stop at `FAILED: link change after drafting is a conflict`.
- Not covered yet: two sessions racing `approve_draft` against a concurrent live edit (needs a `concurrency.sh`-style two-session test); PostgREST behaviour until 0022 is live.
- Next: two-session approve race test; then rewire studio saves through `drafts.ts` (needs 0022 live to exercise end to end); UI waits on the owner's screenshot batch.

## 0022 approval race test (commit fe1b546) — 2026-10-18
- `supabase/verify/concurrency-0022.sh`, run by `run.sh`: two sessions race `approve_draft`:
  1. live edit holds the route row first → approval waits, answers `conflict`, route keeps the live edit, draft kept;
  2. approval holds the route first → it lands whole (fare note, new direction shape, signboards), the waiting live edit lands on top, draft gone;
  3. two approvals of one draft → `approved` / `no_draft`.
- Result on fe1b546 (disposable pg18): full `run.sh` passed.
- Remaining before studio rewiring can be tested end to end: 0022 applied live (owner).

## 0022 recovery (commit 1ac34d0) — 2026-10-18
- New `supabase/apply/0022_revert.sql`: drops the 7 public functions, 4 private helpers (`require_editor`, `text_list`, `refusal`, `link_bumps_subjects`) and trigger `route_stop_bumps_subjects`; deletes the ledger row. No data touched.
- `0022_apply.sql` ledger version is now max(now, last version + 1): `run.sh` caught 0018 and 0022 applied in the same second colliding on the version key.
- `supabase/apply/README.md`: 0022 steps and recovery.
- `run.sh` third database: 0018 → 0022 → revert twice → schema dump equals 0018 alone, ledger row gone → re-apply passes `0022_check.sql`. Full run passed on 1ac34d0.

## 0022 hardening before apply (commit 8b8f383) — 2026-10-18
Owner asked, before applying 0022: required links, link-survival tests, lock order + shared-terminal deadlock tests, has_function_privilege checks, corrected scripts.
- **links required**: new `private.payload_ok` (+ `uuid_ok`, `link_ok`) runs at claim and again at approve (a draft row can be edited after claim). Every direction and the hotspot need a `links` array; every link an object with a uuid string and an integer `stop_sequence`. Before this, a hotspot draft without `links` (or a direction without one) was approved as "no links" and deleted every existing link.
- **links survive rejection**: `after-0022.sql` runs 17 rejected payloads (absent/null/object/string links, bad link, bad ids, stop_sequence 1.5/"1"/null, unknown mode, null name, links to no row) at claim and at approve; links, both revisions and the draft are unchanged each time. `not_null_violation` now maps to `bad_payload`.
- **lock order**: draft → routes by id → hotspots by id, all taken by `private.lock_rows` before any write in `approve_draft`, `take_down`, `put_back`. `deadlock-0022.sh` forces interleaving with a third session holding a direction row. **On the previous code (51c3162) scenario A (route approval vs hotspot approval) and B (two routes sharing terminal T) both raised `deadlock detected`**; now A = approved/conflict, B = approved/approved, C (approval vs take-down of T) = approved/blocked. A wait still broken off answers `busy` (added to `ReviewCode`).
- **permissions**: `private.link_bumps_subjects` was executable by PUBLIC (missing revoke) — fixed. Helpers are now revoked from PUBLIC, anon and authenticated (only the definer functions call them). `0022_check.sql` (10 rows) and the apply post-check use `has_function_privilege` for anon, PUBLIC and authenticated; also security definer, `search_path=""`, trigger enabled, ledger once.
- `0022_revert.sql` drops the 4 new helpers too.
- Result on 8b8f383: full `supabase/verify/run.sh` passed on disposable pg18; typecheck + prettier pass.

## 0022 live — 2026-10-18
- Owner applied `0022_draft_ops` live: ledger version **20261018085951**. Do not reapply.
- Independent check through the anon REST key: all seven RPCs exist and answer `401 / 42501 permission denied` to anon; `draft`, `takedown`, `editor_name` refuse anon (401); counts unchanged (10 routes, 20 directions, 103 hotspots, 256 links); no non-approved route visible to anon.
- Types: `database.types.ts` Functions block carries the seven RPCs (generated from the disposable DB with 0022, applied by hand in the classic format) — commit adc01eb. Migration README row records the version.
- Next: Batch 4 app side — save paths through drafts, then the review UI (needs the owner's screenshots).

## Batch 4 app side, step 1: draft saves behind a flag (owner chose C) — 2026-10-18
- Branch `devin/studio-drafts` (stacked on `devin/draft-ops`), commit 27de456. Owner's rule: full draft flow behind a disabled flag; direct saves stay until submit/approve/send-back/conflict controls are usable and verified, then enable. No automatic approval as the default.
- `src/features/studio/data/flags.ts`: `STUDIO_DRAFTS = VITE_STUDIO_DRAFTS === '1'` (off). `draft-save.ts`: `saveRouteDraft`, `saveHotspotDraft`, `signboardsDraft`, `deleteDirectionDraft` build whole-subject payload v1 and store only in `draft` (`claim_draft` first, then `updateDraft` guarded by the draft's revision).
- Tests: `tests/unit/draft-save-test.mjs` 16 pass (full `test:unit` 870 pass); `supabase/verify/studio-drafts.sh` (in `run.sh`) builds payloads with the studio's code, claims, submits and approves on disposable pg18: no approved row changes until approval, exact apply, `conflict` after a live edit. Full `run.sh` passed. A mutated copy fails as expected. format, lint, typecheck, build pass.
- Wiring (912c13e): with the flag on, `useRouteSave`/`useHotspotSave` save drafts (`onDrafted` → notice toast), signboards' `writeList` drafts, direction delete drafts, hotspot delete is `take_down`, a new place from the route picker is refused. Flag off: every hook keeps its direct branch. Unit 870 pass + draft-save 17; lint, typecheck, docs check, build (also with `VITE_STUDIO_DRAFTS=1`) pass.
- Not yet: submit/approve/send-back/conflict UI (waits on the owner's screenshot batch: draft indicators, review list, draft-vs-approved comparison, send-back, discard, takedown/put-back, Public view, waiting-for-publish); a browser check of the flag-on path against live Supabase.
- Next: the review controls once the screenshots arrive, verify them, then turn the flag on.
- Devin Review on #280 (5 findings), all fixed in 1d72d2e and threads resolved: Edit route's new mode drives the hintuan links; new-line lookup approved-only; removed boards' files kept while drafting; one id per new subject across retries (lost claim answer updates that draft); flag parsed with zod/mini. Unit 874 pass (draft-save 20); studio-drafts.sh passes.

## Codex takeover: review queue, first controls — 2026-10-18

- Sole implementation branch: `codex/review-controls`, from `devin/draft-ops` at `5338283`. Code commit: **bb3bbd3**. No remote push or PR yet; no merges or live database changes.
- Owner approved adding TanStack Query in this session. Added exact `@tanstack/react-query` version `5.104.4` and lockfile. The studio's new review workspace owns an account-scoped query client; it clears on unmount and does not automatically retry mutations. The disabled workflow does not load the review chunk.
- First functional slice: draft/pending queue and counts, refresh/loading/error/empty states, submit confirmation, send-back with a required 1–4,000 character reason, and discard confirmation. Confirmations retain the revision the editor saw; mutations pass it to 0022. An in-flight guard prevents duplicate confirmation requests. Uses existing Button and surface tokens; final visuals remain the owner's work.
- `drafts.ts` now validates RPC result codes, returned draft rows and revision metadata instead of casting untrusted JSON. The queue reads all pages with stable `updated_at`/`id` ordering, then groups pending first. A later-page failure fails the whole queue rather than showing partial results. Existing save-test fixtures now carry complete RPC draft rows.
- Verification: full `npm run check` passed (894 unit tests, including 20 new review tests); explicit typecheck passed; Storybook build passed. After the lazy-load split, format, lint and typecheck passed again, default `npm run build` passed including public bundle/isolation checks, and a flag-on preview build succeeded at `/tmp/parapo-review-preview`. Required local sockets/child processes needed the sandbox's network permission; the initial restricted run failed two existing test files, which passed with that permission. No checks were skipped or relaxed. Node is preinstalled; `~/.nvm/nvm.sh` is absent, so commands source it conditionally.
- Browser testing has **not** run. Owner approval was requested asynchronously, following the handoff's explicit rule, for local stand-in testing only. Do not push before the reached browser suites have run. No browser or live DB verification is claimed for this slice.
- `STUDIO_DRAFTS` stays OFF; this does not complete Batch 4 or make the flag ready to enable. Still needed: comparison and approval, conflict resolution, Playground subject markers/overlays, take-down/put-back controls, Public view and waiting-for-publish list, new-place dependencies and signboard cleanup.
- **Approval issue found by static inspection, not yet reproduced on a disposable DB:** `approve_draft(uuid)` locks the current draft but accepts no expected draft revision. Sequence: reviewer opens pending revision N; another editor edits it (returns to draft) and resubmits revision N+2; the first reviewer's id-only approval can approve N+2. Its existing approved-subject `base_revision` check does not guard that reviewed-draft version. Before adding the Approve control, reproduce this locally and prepare an atomic revision-checked approval entry point in a NEW migration; do not edit or reapply live 0022. Any live application requires the owner's explicit approval.

## Provisional full review UI and isolated preview — 2026-10-18

- Latest owner authorization supersedes the screenshot wait: implement all eight basic screens with existing ParaPo primitives, keep styling provisional, test in preview, and leave deployed flags off. One implementation session; no new application dependency in this batch.
- Branch: `codex/review-controls`, from `devin/draft-ops` at `5338283` (remote base rechecked unchanged). Commits: **ab28dfe** revision-checked approval/conflict SQL and recovery; **335b660** publication source-version metadata; **6ce4392** all eight provisional controls, markers, comparison, draft details and route-place dependencies; **87fc4f8** isolated preview tools and complete API/browser verification. A following test commit adds the complete route-picker dependency-approval scenario.
- Hosted preview + screenshots + checklist: **https://parapo-studio-review-preview.villaralvorovic2.workers.dev/review-guide.html**. Separate static Worker `parapo-studio-review-preview` in the existing connected Cloudflare account. Existing `parapo`, staging and production were not modified. Assets served free; no paid service, auth configuration or live database change was provisioned.
- Hosted preview uses browser-local, resettable sample fixtures, a deliberately invalid API domain, and a separate injected adapter outside the app's entry points. The remote click-through passed all eight states and phone layout with **zero live Supabase requests**. The same app was independently tested against actual Postgres 17 + PostgREST transactions on a disposable loopback API. Do not treat the sample adapter as SQL verification.
- New migration **20261018112757_reviewed_draft_approval.sql is NOT applied live**. `approve_reviewed_draft` locks and checks the displayed draft revision before calling 0022's atomic approval. `refresh_draft_base` checks both displayed draft and approved-subject revisions, keeps the payload, and returns it to draft for a new submit/review/approve cycle. Anonymous/non-editor refusals, stale review, stale base, repeated apply and repeated recovery/schema equality passed. No 0018, 0021 or 0022 live reapplication.
- Current classic database types were preserved. Generation against the disposable schema was inspected, but the current CLI emits the newer ComputedFields/NonNullable format, so that output was not copied. Regenerate with a classic-compatible generator after approved live application.
- `source_revisions` on schema-5 published snapshots contains public route/place revision counters only. The queue compares exact approved versions, so late and identical-content approvals stay waiting until included. Older files keep their formats; old schema-5 snapshots use the timestamp fallback until the first new publication.
- **Verification:** full `npm run check` passed with **906 unit tests**; typecheck and Storybook build passed; default and draft-on builds passed. Public bundle/isolation guards passed. Default flag-off `save-test`: **148/0**, and `loop-test`: **35/0** with the suite's supported `PARAPO_NO_TILES=1` sandbox profile (the first external-tile run could not load its style). No assertions skipped or loosened.
- `review-test.mjs`: drawing/save leaves approved rows unchanged; submit/send-back/note/edit/resubmit/approve; waiting; actual isolated publisher; Public iframe; take-down/put-back; conflict/rebase; discard; common 390px layout; no page errors. `review-publication-test.mjs`: exact source-version clearing, late approval, identical-content approval, published takedown and restoration all pass. `review-route-picker-test.mjs`: new head and tail and route remain drafts without approved writes; route approval is disabled until both places are approved, then guarded route approval succeeds. `review-demo-test.mjs` passes locally and on the deployed isolated sample preview.
- Detailed click-through and isolation notes: `review-controls-preview.md`. Screenshots are included in the hosted guide and `/workspace/ParaPo-review/screenshots`.
- Rollout stays owner-controlled: review the preview/designs and the new migration, land the open base stack and separate publish-protection PR #275 as appropriate, apply only the new approved migration, preserve/regenerate classic types, verify the real signed-in environment, then obtain explicit approval before enabling drafts. No auto-approval. Unreferenced signboard-file garbage collection remains deferred; files are retained safely. Contributor upload/tools, backups, change history and iPhone installation were not expanded into this UI batch.
