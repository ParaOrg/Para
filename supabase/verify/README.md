# Checking a migration on a throwaway database

`run.sh` builds a fresh database from every migration in ledger order on a
plain Postgres (no Supabase project), adds rows as the live project has them,
applies 0018 over them twice through `../apply/0018_apply.sql` (the file the
owner pastes), then checks it, and undoes it on a second database:

- `bootstrap.sql`: stand-ins for what the migrations expect of Supabase
  (`anon`, `authenticated`, `auth.users`, `auth.uid()`, `storage`). Only for a
  throwaway server.
- `before-0018.sql`: rows that exist before the migration.
- `after-0018.sql`: reads as `anon`, a signed-in non-editor and an editor;
  uniqueness on approved rows (routes, loops, terminals); the two guards; the
  takedown log; the aggregate revision; drafts.
- `concurrency.sh`: two sessions race an approval against a take-down of one
  of its ends, in both orders.
- `after-0022.sql`, after `../apply/0022_apply.sql` (twice) and
  `../apply/0022_check.sql`: the review operations refuse anon and
  non-editors; a malformed payload is `bad_payload`; draft saves leave
  `route`/`stop` untouched; approve writes the hotspot, route, direction,
  signboards and links, and a retry is `no_draft`; a link changed after
  drafting is a `conflict` that leaves the route and draft as they were;
  stale send-back/discard are `revision_mismatch`; emptying every direction
  takes the route down (logged); put back and take down refuse a repeat.
- `concurrency-0022.sh`: two sessions race `approve_draft` against a live
  edit of its route in both orders (edit first: `conflict`, nothing applied;
  approval first: it lands whole and the edit lands on top) and against a
  second approval of the same draft (`approved` / `no_draft`).
- `deadlock-0022.sh`: a third session holds a direction row so one approval
  stops part-way while a second starts: a route approval adding hotspot S
  against S's approval linking that route (`approved` / `conflict`), two
  route approvals sharing terminal T (both `approved`), and a route approval
  against taking T down (`approved` / `blocked`). None may deadlock or raise.
- `after-0022.sql` also refuses missing or wrong `links` (absent, null, an
  object, a string, a bad link, a bad id) at claim and at approve, plus bad
  values (unknown mode, no name, a link to no row): the approved links, both
  revisions and the draft stay.
- `../apply/0018_check.sql` must be all true after the apply, and
  `../apply/0018_revert.sql` must refuse over a takedown and, on a clean
  database, leave a schema dump identical to one 0018 never touched.

```sh
docker run -d --name pg-verify -e POSTGRES_PASSWORD=pw postgres:17
PSQL="docker exec -i pg-verify psql -U postgres" supabase/verify/run.sh
docker rm -f pg-verify
```

A third database applies 0018, then 0022, then `../apply/0022_revert.sql`
twice: the schema dump must match 0018 alone, the ledger row must be gone,
and re-applying 0022 must pass `0022_check.sql` again.

It ends with `0022 revert: schema as before 0022 (twice), ledger row gone,
re-apply passes 0022_check.sql`, or stops at the first failure.

## studio-drafts.sh

The studio's draft saves (`src/features/studio/data/draft-save.ts`, behind
`VITE_STUDIO_DRAFTS`) end to end. Each payload is built by the studio's own
code (`studio-drafts.mjs`) from the rows as they stand, claimed as an editor,
submitted and approved. It checks that a stored draft changes no approved row
(a hash of every fixture row before and after each claim), and that approval
applies exactly the payload: an edit that drops a hintuan the line no longer
passes and keeps a ticked terminal, a signboard list, a direction emptied, the
last one taking the route down, a new route with its empty slot, and a new
hotspot. A live edit after drafting makes approval answer `conflict`, with the
approved rows left as that edit made them. Needs `node` (24) on the PATH.


## Reviewed approval entry points

`run.sh` also applies `20261018112757_reviewed_draft_approval.sql` twice and runs
`reviewed-draft.sql`. A stale reviewer is refused even after another editor
changes and re-submits the draft. A stale approved-base comparison is refused;
an explicit base refresh changes only the draft and requires resubmission.
Anonymous and non-editor calls are refused. All test fixtures are rolled back.
The new recovery script runs twice and restores the exact 0022 schema.
This is disposable verification only; the new migration is not applied live.

## contributions.sh

The contributions migration (`migrations/20261019125900_contributions.sql`) on
databases of its own, run last by `run.sh` or alone:

    PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/contributions.sh

It applies the paste file twice (the second run must stop and change nothing),
requires `20261019125900_contributions_check.sql` all `t`, then runs
`after-contributions.sql`:

- anon reaches no table and cannot save
- a phone saves; a resend answers `already saved` and writes nothing
- the server stamps the contributor and the times
- a phone reads only its own contributions and its own contributor row, never points
- phone B cannot read A's, save over A's id, delete A's or add points to them
- the editor reads everything and deletes nothing
- refused whole, with no row or point left behind: faster than 150 km/h, outside
  the Philippines, more than 14,400 points, totals that disagree, longer than
  6 hours, time not increasing, a description over 1,000 characters
- the 21st save in 24 hours is refused, and a resend at the cap is still `already saved`
- a blocked phone saves nothing and cannot delete its contributor row
- deleting a contribution takes its points and hintos; deleting again is a no-op
- deleting the auth user cascades

`contributions-race.sh` sends one recording twice at once: `saved` and
`already saved`, one row. The revert must refuse while contributions are
stored; on a second database, apply then revert twice leaves the schema as
before, and re-applying passes the check.

## contribution-use.sh

`migrations/20261022090000_contribution_use.sql` on databases of its own, run
last by `run.sh` or alone:

    PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/contribution-use.sh

It applies every earlier migration, contributions through its paste file, then
applies `../apply/20261022090000_contribution_use_apply.sql` twice (the second
run must stop and change nothing), requires `…_check.sql` all `t`, then runs
`after-contribution-use.sql`:

- anon reaches nothing and blocks no one
- a phone reads and adds no uses, blocks no one, and cannot unblock itself or touch its contributor row
- an editor adds, reads and deletes uses; a duplicate link, a bad kind and a forged `editor_id` are refused; nothing is updated
- block stamps who, when and why, and a blocked phone fails `can_contribute()`; unblock clears all three; an unknown phone is refused
- `retire_month` refuses a recent month and a non-month, then cuts 200 m off each end, drops the hintos near the ends, clears the text, unlinks the phone and drops the piece; the use stays; a second run changes nothing
- `add_months` makes the next pieces

The revert must refuse over a blocked contributor and over a stored use; on a
second database, apply then revert twice leaves the schema as before, and
re-applying passes the check. The script needs a server that has `anon`,
`authenticated` and `service_role` already, like `contributions.sh`.

## signup-hook.sh

`migrations/20261023090000_signup_hook.sql` on databases of its own, run last
by `run.sh` or alone:

    PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/signup-hook.sh

It applies every earlier migration, then `../apply/20261023090000_signup_hook_apply.sql`
twice (the second run must stop and change nothing), requires `…_check.sql` all
`t`, and calls the hook with each of the three roles:

- as `supabase_auth_admin`: an anonymous event returns `{}`; an email event and an event with no anonymous flag return the 403 error object
- as `anon` and `authenticated`: permission denied

On a second database, apply then revert twice leaves the schema as before, and
re-applying passes the check. The script creates `supabase_auth_admin` when the
server lacks it (a real Supabase project has it).

## contributor-accounts.sh

`migrations/20261024090000_contributor_accounts.sql` on databases of its own, run last
by `run.sh` or alone:

    PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/contributor-accounts.sh

It applies every earlier migration, the contributions and contribution_use paste files, then
`../apply/20261024090000_contributor_accounts_apply.sql` twice (the second run must stop and change
nothing), requires `…_check.sql` all `t`, and runs `after-contributor-accounts.sql` as the real roles:

- `set_profile` refuses a signed-out and an anonymous caller, a bad number and a bad name, trims, and edits
- a contributor cannot select the phone, insert a name or update its profile; an editor reads names, not phones; `anon` reads nothing and calls nothing
- a claim moves exactly the anonymous identity's contributions (with their hintos), nobody else's; a newer `begin_claim` replaces the earlier token; a repeat is 0; another account's reuse, an expired token, an unknown token and a token of an upgraded identity do nothing; a block carries over

The revert refuses over a stored name. On a second database, apply then revert twice leaves the
schema as before, and re-applying passes the check.

## account-stats.sh

`migrations/20261031090000_account_stats.sql` on databases of its own, run last by `run.sh` or alone:

    PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/account-stats.sh

It applies every earlier migration, the contributions, contribution_use and contributor_accounts
paste files, then `../apply/20261031090000_account_stats_apply.sql` twice (the second run must stop
and change nothing), and runs `…_check.sql`: its rolled-back behaviour part must raise nothing and
leave no row behind, and its 9 read-only rows must be `t`. The revert refuses over a stored split
and over retired totals. On a second database, apply then revert twice leaves the schema as before,
and re-applying passes the check.

## delete-my-account.sh

`migrations/20261031100000_delete_my_account.sql` on databases of its own, run last by `run.sh` or alone:

    PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/delete-my-account.sh

It applies every earlier migration, the contributions, contribution_use, contributor_accounts and
account_stats paste files, then `../apply/20261031100000_delete_my_account_apply.sql` twice (the
second run must stop and change nothing), and runs `…_check.sql`: its rolled-back behaviour part must
raise nothing and leave no row behind, and its 5 read-only rows must be `t`. On a second database,
apply then revert twice leaves the schema as before, and re-applying passes the check.
## contribution-fare.sh

`migrations/20261031110000_contribution_fare.sql` on databases of its own, run last by `run.sh` or alone:

    PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/contribution-fare.sh

It applies every earlier migration, the contributions, contribution_use, contributor_accounts and
account_stats paste files, then `../apply/20261031110000_contribution_fare_apply.sql` twice (the
second run must stop and change nothing), and runs `…_check.sql`: its rolled-back behaviour part must
raise nothing and leave no row behind, and its 7 read-only rows must be `t`. The revert refuses over a
stored fare, over retired totals counting one and over an E-Jeep ride. On a second database, apply then revert twice
leaves the schema as before, and re-applying passes the check.
