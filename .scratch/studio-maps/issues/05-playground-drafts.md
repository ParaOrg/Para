# 05: The Playground saves drafts

Status: ready-for-agent
Type: task
Wave: 3
Who: Sonnet
Blocked by: 01, 04

01 must be applied.

## What to build

`../spec.md`, "Draft → Pending → Approved" and "Playground"; `../../contribute/database.md` §8.

- **Save writes the editor's draft,** never the approved row: a route with both its directions, or a hotspot, as one payload, checked with Zod (`src/features/studio/data/draft-schema.ts`) on the way in and out. A new route or hotspot gets its id now, kept when approved.
- **The Playground shows** approved rows with the drafts laid over them, each marked Draft, Pending or Taken down (a word, not colour alone).
- **"Being changed by X"** on another editor's draft, from `editor_name`: it can be looked at, not changed.
- **Discard:** your own draft, after asking once. Another editor's after 7 days without a change, if contribute/02 approved it.
- A draft's passes (its hintuans) are worked out in the browser for display only. Nothing is linked until approval (06).

## Files it owns

`src/features/studio/data/drafts.ts` and `draft-schema.ts`, `src/features/studio/review/` (the marks and the notice), and the save flow in `src/features/studio/panels/` that now ends in a draft. The studio's main screen, from 04.

## Acceptance checks

- Two editors in two browsers: the second sees "being changed by X" and can't save over the first.
- After any number of saves, the publish run by hand writes byte-identical files.
- Unit checks: a payload round-trips through the schema; an old payload version still reads.
- The studio's headless suite; `npm run check`.

## Comments
