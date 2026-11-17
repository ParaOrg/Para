# 17: The contributions preview runs again, and in CI

Status: ready-for-agent
Type: task
Who: Opus, in a session that has Docker
Blocked by: the pull request that gives the browser suites one setup action (branch `claude/ci-browser-suite-action`), for step 3 only

## Why

`tests/e2e/contributions-preview-test.mjs` is the only end-to-end proof that a ride uploaded from a phone
reaches the studio's Contributors map on the real SQL: two phones upload through real PostgREST, row
security keeps each to its own, and an editor finds every upload in the list and on the map. No workflow
runs it, so nothing noticed when it fell behind the app.

It has fallen behind. The preview's database script, `scripts/preview/contributions-db.sh`, builds a
database from the migrations as they stood around 2026-10-21: the numbered ones, `reviewed_draft_approval`,
`contributions`, `draft_update_own`, `review_rules`, `draft_update_makerless` and `draft_published`. The
app has since come to call ten functions that list never creates:

| function | made by |
| --- | --- |
| `am_i_editor` (the studio asks at sign-in) | `20261030090000_am_i_editor` |
| `block_contributor`, `unblock_contributor` | `20261022090000_contribution_use` |
| `get_profile`, `set_profile`, `begin_claim`, `finish_claim` | `20261024090000_contributor_accounts` (`finish_claim` again in `20261031090000_account_stats`) |
| `get_my_stats` | `20261031090000_account_stats`, `20261031110000_contribution_fare` |
| `get_my_uses` | `20261106090000_my_contribution_uses` |
| `delete_my_account` | `20261031100000_delete_my_account` and its three later versions |

So the suite cannot pass against today's studio and contributor page as the preview stands.

## What to build

In this order. Each step is its own pull request.

1. **Bring the preview's database up to the ledger.** `scripts/preview/contributions-db.sh` applies every
   migration `supabase/migrations/README.md` lists as applied, in the ledger's order, each through its paste
   file where it has one, the way `supabase/verify/schema-snapshot.sh` does (its `APPLIED` list is the order
   to follow; consider reading the list from one place so the two cannot drift again). Keep the script's
   refusal of anything but a local `docker exec`. Check whether `scripts/preview/contributions-server.mjs`,
   which stands in for Supabase Auth, needs anything new for the sign-ins the pages use today.
2. **Run the suite and repair what has drifted in it.** Follow `scripts/preview/README.md`,
   "Contributions (upload → Studio Contributors)", steps 1 to 5. Fix selectors and steps that no longer
   match the pages. Do not change what a check expects without saying so in the pull request: if a check
   and the app disagree, list it for the owner instead. Update the suite's line in `tests/e2e/README.md`
   with the true count.
3. **Add the job.** A job in `.github/workflows/database.yml` beside `review`, on the same triggers, that
   runs the five steps: its own Postgres 17 container, the database script, PostgREST v12 on
   `127.0.0.1:4291`, a build with `VITE_SUPABASE_URL=http://127.0.0.1:4280/api`,
   `VITE_SUPABASE_PUBLISHABLE_KEY=isolated-preview-publishable`, `VITE_CONTRIBUTIONS=1` and
   `VITE_EXPOSE_MAP=1` into `/tmp/para-contributions-preview`, the stand-in server, then the suite. It
   cannot share the review job's containers: the database, the PostgREST port and the build all differ.
   Add the suite and `scripts/preview/**` to the workflow's paths if they are not there. Use the shared
   setup action for Node, `npm ci` and Chromium.

## Acceptance

- Step 1: on a throwaway container, the script ends with every applied migration in, and
  `select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
  and p.proname in ('am_i_editor', 'block_contributor', 'unblock_contributor', 'get_profile', 'set_profile',
  'begin_claim', 'finish_claim', 'get_my_stats', 'get_my_uses', 'delete_my_account')` gives at least 10.
- Step 2: the suite passes locally against the preview, with its output pasted in the pull request. It
  still refuses anything but a loopback address and still fails on any request to a `supabase.co` host.
- Step 3: the new job is green in the pull request's own run, and red when the suite is made to fail
  (show once, then remove).
- `npm run check` passes for each step.

## Out of scope

- The live project: nothing here reads or changes it.
- The review preview (`review-db.sh`, `review-test`, `review-publication-test`), which runs in CI today.
- Fetching PostgREST or any other program from outside onto a development machine: use the container
  image the README names.

## Notes

Found on 2026-11-11 while preparing to add the job: reading the script against the app was enough to see
the gap; the preview could not be run where it was found (no Docker there).
