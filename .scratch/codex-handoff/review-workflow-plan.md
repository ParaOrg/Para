# Review workflow implementation plan

Prepared 2026-10-18 from staging code and the approved local specs. Planning only; no SQL, app edits or tests performed.

## Batch 1: review database foundation (0018)

Scope: `supabase/migrations/0018_review.sql`, regenerated database types, migration ledger documentation and narrowly scoped database verification. No redesign or save-flow behavior change in this batch.

- Add `route`/`stop` approved/taken-down status and timestamps; add/touch `stop.updated_at`. Existing records default approved.
- Add editor-only `draft` (versioned JSON payload, unique kind/subject, draft/pending state, author, note, base version, timestamps), `editor_name`, and `takedown`.
- Preserve uniqueness semantics on approved rows only: ends/via, terminal place, loop signboard/via. Preserve the existing index expressions, including 0021's loop expression.
- Replace public route/direction/hotspot/link reads with approved-only policies; retain editor visibility of everything. Explicit grants after 0017; takedown anon grant names only kind/subject/time.
- Guard route approval against unapproved ends, exempt null-ended loops. Guard taking down an approved route's end hotspot. Serialize concurrent approve/takedown operations on the affected rows; a plain cross-table existence check alone can race.
- Keep `private.loop_one_way` able to read route rows for every direction writer. Do not change loop immutability or its one-direction contract.
- Decide the aggregate route revision strategy before freezing SQL (see gaps below). No contribution tables/auth settings in this batch.

Verification: apply to a disposable schema/database first; existing public output byte-identical; editor can list/save; anon/non-editor cannot read drafts/names; approved-only route/link visibility; loop operations preserved; unique-index conflicts and both guard directions tested, including concurrency. Live application and publication checks happen only after review of the concrete migration. Regenerate types after actual application.

## Batch 2: publication protection

Own `scripts/publish/`, output privacy checks, relevant unit checks. Implement takedown-aware shrink accounting by distinct missing subjects, including dependent directions/links; old or repeated takedown records must not hide unrelated losses. Add anon probes for contributor/private tables (missing tables acceptable before 0019). Prove four intentional takedowns out of ten pass while unexplained empty results fail.

## Batch 3: draft contract and Playground saves

Own `features/studio/data/drafts*`, review state and save integration; one builder owns save-panel/main-screen edits.

- Define a versioned route aggregate containing facts, both directions (one for loops), stable client-generated IDs, drawings/borrow data, signboard lists; hotspot aggregate includes outline, aliases and terminal selections.
- Load approved geometry lazily when starting a draft; list reads currently hold only overviews. Overlay drafts without writing live links.
- Save/update only the draft; atomic claim of unique subject; author edit rules, pending read-only, seven-day discard confirmation. Use conditional draft revisions to prevent same-session/tab lost updates.
- Route every mutation entry point through this contract: route/direction edits, hotspot saves, signboard add/remove/reorder, current delete actions. Local unfinished drawing recovery remains separate.
- Add explicit draft/pending/taken-down text and existing approved UI patterns. Owner supplies missing visual decisions in one screenshot/design batch.

## Batch 4: review and publication view

- Submit with existing validation; compare approved versus full draft; any editor may approve, including author; send back with note.
- Prefer one database transaction/RPC for conflict check, route/hotspot writes, direction/link updates, takedown log/status changes and final draft removal. Reuse pure normalization/geometry rules, not multi-request persistence orchestration. Compute geometry in the browser against versioned approved inputs and verify those versions at commit, or choose a server geometry implementation explicitly.
- Keep stable IDs and record an approval operation/result so a lost success response can be retried safely. Return machine-readable conflict/refusal codes mapped to plain UI messages.
- Add Public view using the existing published reader and waiting-for-publish list; approval of an already-approved row must refresh its publication-change timestamp.
- End-to-end proof: draft saves leave public files unchanged; approve -> publish -> visible; takedown -> absent with guard passing; put-back -> visible. Force an intermediate failure and concurrent approval; ensure no partial approved state, no duplicate inserts, no missing links.

## Gaps in the approved plan to resolve before affected work

1. **Route conflict version is incomplete.** `route.updated_at` and `route_variant.updated_at` have separate touch triggers (0001); direction geometry/signboard changes do not touch route. Recommendation: use an aggregate route revision, updated under parent locking for direction/link changes, or capture/check all affected row revisions. A route-only timestamp check is insufficient.
2. **Retry retention is not atomicity.** Approved spec says reuse existing saves and delete draft last. Current `routes-write.ts`, `save-route.ts` and `hotspots-write.ts` issue multiple commits; hotspot replacement deletes links before insertion, and route facts may change before direction failure. Retaining the draft allows retry but does not stop nightly publish seeing partial results. Recommendation: atomic approval RPC, documenting the persistence adjustment before implementation.
3. **All mutations must participate.** `signboards.ts` directly updates live direction lists and deletes storage objects; current delete helpers remove live rows/directions. Recommendation: signboard list changes become draft data, preserve approved files until no approved/draft reference needs them; existing approved-item deletion becomes Take down. Owner must settle whether removing one direction means approving an empty slot, and what destructive deletion remains available for taken-down items.
4. **Timestamp meaning.** `status_at` alone only advances on status changes unless specified. Approving edited content already approved must also appear in the waiting list. Record the approval time on every approval or use a dedicated publication-change timestamp.
5. **Partial uniqueness changes recovery queries.** `claimExistingRoute().maybeSingle()` and loop duplicate scans currently search without status. Taken-down duplicates become legal after 0018. Filter approved recovery targets; never claim a taken-down route accidentally. Put-back conflicts require a plain refusal.

## Owner/design/config dependencies

- No new product policy is needed for default map, self-approval or seven-day discard: already approved.
- Owner screenshots/decisions needed for draft status markers, pending comparisons, send-back/discard/takedown dialogs, publish-waiting list and destructive direction removal policy. Design gaps do not block drafting/reviewing 0018.
- Populate editor display names and choose the target database/verification environment. Do not enable CAPTCHA or anonymous auth as part of this studio-only batch.
- Mandatory recorder map, screenshot references and no cheap-phone release blocker remain the accepted broader scope.
