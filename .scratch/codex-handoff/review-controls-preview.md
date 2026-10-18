# Provisional studio review preview

Branch: `codex/review-controls`, based on `devin/draft-ops` at `5338283`.

The owner explicitly authorized provisional UI using existing ParaPo controls, all eight screens/states, and preview browser verification on 2026-10-18. Final design remains with the owner. No additional application dependency was added in this batch; TanStack Query was already approved and added in the preceding slice.

## Click-through

1. Open the preview and use **Reset sample** if needed. Open **Drafts and review**, then **Review changes** for **Preview new place**.
2. **Submit for review**. Inspect the drawing and changed fields, then **Send back** with a reason. Change the draft details, save, submit again, and **Approve reviewed changes**.
3. **Waiting for publication** now lists the approval. Public view still shows the old snapshot. Close review, press the preview-only **Publish sample**, switch to **Public**, and **Reload published map**.
4. In **Routes and places**, search for the place, **Take down**, confirm, publish the sample, and reload Public. **Put back** reverses it after another publication.
5. A sample route has an approved-data conflict. Inspect both versions, explicitly choose to keep the draft, and submit it for a new review. A different draft can be discarded with confirmation.
6. New Route and New hotspot still use the existing drawing tools. Saving with preview drafts enabled stores drafts only. New places from route pickers are drafts too; review/approve their dependencies before approving the route.

## Isolation and deployment

- The shared hosted preview uses browser-local sample fixtures, with its own Reset/Publish sample controls. It is not a connection to live Supabase. The same UI was separately verified against an isolated Postgres 17 + PostgREST API, exercising the actual migrations and RPCs.
- Preview helpers live under `scripts/preview/` and are never imported by the deployed application. The hosted build uses the deliberately invalid `parapo-isolated-preview.invalid` address, intercepted by its sample adapter. It contains no live database session or secret.
- Production/staging environment flags are unchanged. `VITE_STUDIO_DRAFTS` remains off by default. No auto-approval path exists.
- New migration `supabase/migrations/20261018112757_reviewed_draft_approval.sql` is prepared and applied only to disposable databases. It adds revision-checked `approve_reviewed_draft` and explicit `refresh_draft_base`. Live application needs owner approval; do not reapply 0018, 0021 or 0022. Regenerate the database types in their classic format after approved live application.
- Conflict resolution keeps the draft payload and updates its base only under expected draft and approved-subject revisions. It returns to `draft` and requires a fresh submit/review/approve. A checked conflict confirmation resets when the approved revision changes. Unsaved draft-fact edits are retained when another editor updates the draft.
- Public snapshot schema 5 gains optional public `source_revisions` counters, with no editor/contributor data. This lets the publication queue identify the exact approved versions included, including no-op approvals and approvals that land during publication. Older snapshot files retain their formats; old schema-5 files use the timestamp fallback until the first new publication.

## Verification

Record final commands and results in `workflow.md`. No live database writes, staging/main merges, auth-setting changes, or paid-service provisioning are authorized by this preview work.

The hosted preview's complete remote click-through passed with zero live Supabase
requests. Final validation: 906 unit tests, 148 flag-off studio save checks, 35 loop
checks, full disposable SQL/race/recovery verification, actual API publication
version checks, route-picker dependency approvals, typecheck and Storybook build.
The open publish-protection PR #275 and base stack still need the owner's normal
review/merge sequence before real rollout. No staging/main merge was performed.
