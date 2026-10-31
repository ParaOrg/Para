# Applying 0018 to the live project

Three files, each pasted whole into the SQL editor as `postgres`:

| File | What it does |
| --- | --- |
| `0018_apply.sql` | One transaction: checks 0021 is applied, records what `anon` reads, applies `migrations/0018_review.sql` (carried unchanged; `verify/run.sh` checks the copy), checks `anon` reads exactly the same rows, that no other read rule would show a taken-down row, and that the three uniqueness indexes are 0018's, then writes the ledger row `0018_review`. Any failed check raises and nothing is changed, ledger included. Safe to run twice. |
| `0018_check.sql` | Read-only, one row per check; every `ok` should be `t`. Rows 3 and 4 (every route/hotspot approved) hold until the studio takes something down. |
| `0018_revert.sql` | One transaction: undoes 0018 and removes its ledger row. Refuses, changing nothing, once a row is taken down or a draft is kept. |

## Steps

1. Run `0018_apply.sql`. It ends with `COMMIT`; an error means nothing changed.
2. Run `0018_check.sql`: 13 rows, all `ok = t`.
3. Check what the publish reads, with the publishable key (the session that
   wrote this can do it): row counts through the API must be unchanged.
   Before 0018 (2026-10-18): 10 routes, 20 directions, 103 hotspots, 256
   links, 0 Ikot.
4. Regenerate `src/shared/types/database.types.ts` and add the ledger version
   to `migrations/README.md`.

## Recovery

- Apply failed: nothing changed. Read the message; each names what it found.
- Applied, and the studio or the publish misbehaves: run `0018_revert.sql`.
  It puts the schema back exactly as 0021 left it (`verify/run.sh` compares a
  schema dump before and after) and deletes the ledger row. No data row is
  lost: 0018 only adds columns, tables, triggers, indexes and read rules.
- Once a takedown or draft exists, the revert refuses: undoing would publish
  what was taken down and drop the drafts. Put the rows back (status
  `approved`) and settle the drafts first.

## While it runs

The `alter table` statements lock `route`, `route_variant`, `stop` and
`route_stop` for a moment (small tables, no rewrite). The public map reads
published files, not the database, so commuters see nothing; an editor saving
at that moment waits for it.

# Applying 0022 to the live project

0018 must already be applied (it is, ledger `20261018054405`). Three files,
each pasted whole into the SQL editor as `postgres`:

| File | What it does |
| --- | --- |
| `0022_apply.sql` | One transaction: checks 0018 is applied, applies `migrations/0022_draft_ops.sql` (carried unchanged; `verify/run.sh` checks the copy), checks the seven review functions exist and `anon` cannot run them, then writes the ledger row `0022_draft_ops`. Any failed check raises and nothing is changed. Safe to run twice. Adds functions and one trigger only; no table or row changes. |
| `0022_check.sql` | Read-only, 10 rows, all `ok` should be `t`. Privileges are read with `has_function_privilege`, which counts PUBLIC and inherited grants: `anon` and PUBLIC execute nothing, `authenticated` executes the seven review functions but none of the eight helpers. |
| `0022_revert.sql` | One transaction: drops the seven functions, the eight private helpers and the link trigger, and removes the ledger row. Touches no data. Safe to run twice. |

## Steps

1. Run `0022_apply.sql`. It ends with `COMMIT`; an error means nothing changed.
2. Run `0022_check.sql`: 10 rows, all `ok = t`.
3. Tell the session; it checks through the API that `anon` gets refused by the
   functions and the public row counts are unchanged, then regenerates
   `src/shared/types/database.types.ts` and records the ledger version.

## Recovery

- Apply failed: nothing changed. The message names what it found.
- Applied, and something misbehaves: run `0022_revert.sql`. `verify/run.sh`
  checks the schema afterwards matches 0018 alone and that 0022 re-applies.
  Drafts and takedowns are 0018's tables and are kept. Undo 0022 before ever
  undoing 0018.
- The studio does not call these functions yet, so neither applying nor
  reverting changes what an editor or commuter sees today.

# Applying the contributions migration to the live project

**Applied live 2026-10-19** (ledger `20261019144009`, the paste file from #289's branch); the check returned 10/10 true. Do not reapply. Applying it creates the
tables only: no phone can upload until anonymous sign-ins and CAPTCHA
(Turnstile) are turned on in Supabase Auth, a separate owner step, and the studio's
Turnstile sign-in must ship before CAPTCHA is turned on project-wide.

| File | What it does |
| --- | --- |
| `20261019125900_contributions_apply.sql` | One transaction: checks the editor check (0005) exists, anon cannot write routes (0017), and it has not run; applies `migrations/20261019125900_contributions.sql` (carried unchanged; `verify/contributions.sh` checks the copy); checks row security and that anon reaches nothing; writes the ledger row `contributions`. A second run stops at the first check and changes nothing. Adds tables, functions and triggers; touches no route data. |
| `20261019125900_contributions_check.sql` | Read-only, 10 rows, all `ok` should be `t`. |
| `20261019125900_contributions_revert.sql` | One transaction: drops the four tables, `save_contribution` and the five private helpers, and removes the ledger row. Refuses while any contribution is stored, since that would delete phones' recordings. Safe to run twice. |

## Steps

1. Run `20261019125900_contributions_apply.sql`. It ends with `COMMIT`; an error means nothing changed.
2. Run `20261019125900_contributions_check.sql`: 10 rows, all `ok = t`.
3. Regenerate `src/shared/types/database.types.ts` in the classic format, and record the
   ledger version in `migrations/README.md`.

## Recovery

- Applied, and nothing has been uploaded: run `20261019125900_contributions_revert.sql`.
  `verify/contributions.sh` checks the schema afterwards matches the schema before, and that it re-applies.
- Applied, and phones have uploaded: the revert refuses. Decide with the owner what happens to those recordings first.

# Applying reviewed_draft_approval to the live project

**Applied live 2026-10-20** (ledger `20261020034722`; check 6/6 true). Do not reapply. It was needed before the studio's drafts are turned on
(`STUDIO_DRAFTS`): the review screens approve with `approve_reviewed_draft`,
which checks the reviewer approves exactly the draft version they compared, and
settle a conflict with `refresh_draft_base`. Adds two functions; changes no
table, row or existing function.

| File | What it does |
| --- | --- |
| `20261018112757_reviewed_draft_approval_apply.sql` | One transaction: checks 0022 is applied; applies the migration (carried unchanged; `verify/run.sh` checks the copy); checks both functions are definers with a pinned path that only signed-in users can call; writes the ledger row `reviewed_draft_approval`. Safe to run twice. |
| `20261018112757_reviewed_draft_approval_check.sql` | Read-only, 6 rows, all `ok` should be `t`. |
| `20261018112757_reviewed_draft_approval_revert.sql` | Drops the two functions and the ledger row. No data touched. Safe to run twice. |

## Steps

1. Run `20261018112757_reviewed_draft_approval_apply.sql`. It ends with `COMMIT`; an error means nothing changed.
2. Run `20261018112757_reviewed_draft_approval_check.sql`: 6 rows, all `ok = t`.
3. Send the ledger version (`select version from supabase_migrations.schema_migrations where name = 'reviewed_draft_approval'`) so it is recorded in `migrations/README.md`.

# Applying contribution_use to the live project

**Not applied live.** The contributions migration must already be applied (it
is, ledger `20261019144009`). It adds one table and the block, unblock and
retention functions; no route data and no stored contribution is touched. Three
files, each pasted whole into the SQL editor as `postgres`:

| File | What it does |
| --- | --- |
| `20261022090000_contribution_use_apply.sql` | One transaction: checks `contributions` is in the ledger and this has not run; applies `migrations/20261022090000_contribution_use.sql` (carried unchanged; `verify/contribution-use.sh` checks the copy); checks row security is on, `anon` holds nothing, `public.block_contributor` / `unblock_contributor` are definers with a pinned path that only signed-in users can run, and the five private helpers are run by no API role; writes the ledger row `contribution_use`. Any failed check raises and nothing is changed. A second run stops at the first check and changes nothing. |
| `20261022090000_contribution_use_check.sql` | Read-only, 8 rows, all `ok` should be `t`. Privileges are read with `has_table_privilege` / `has_function_privilege`, which count PUBLIC and inherited grants. `authenticated` holds select, insert and delete on `contribution_use` (the three policies only let an editor through) and never update. |
| `20261022090000_contribution_use_revert.sql` | One transaction: drops the two public functions, the five private helpers and the table, and removes the ledger row. Refuses, changing nothing, while `contribution_use` has rows or any contributor is blocked. Monthly pieces made by `add_months` are left. Safe to run twice. |

## Steps

1. Run `20261022090000_contribution_use_apply.sql`. It ends with `COMMIT`; an error means nothing changed.
2. Run `20261022090000_contribution_use_check.sql`: 8 rows, all `ok = t`.
3. Regenerate `src/shared/types/database.types.ts` in the classic format, and record the
   ledger version (`select version from supabase_migrations.schema_migrations where name = 'contribution_use'`) in `migrations/README.md`.
4. The ticket-08 phone checklist, with two test phones A and B and the publishable key
   (anonymous sign-in on, `.scratch/contribute/issues/08-contributor-tables.md`):
   a save, a resend (`already saved`), B cannot read A's, over-cap and out-of-range
   recordings refused, the 21st in 24 hours refused; an editor blocks A
   (`select public.block_contributor('<id>', 'note')` as an editor) and A's next save is refused,
   A cannot unblock itself; A deletes its recordings and its contributions, points, hintos
   and uses are gone; `private.retire_month(month, 0)` on a test month inside `begin; … rollback;`.

## Recovery

- Apply failed: nothing changed. The message names what it found.
- Applied, and nothing is stored in `contribution_use`: run `20261022090000_contribution_use_revert.sql`.
  `verify/contribution-use.sh` checks the schema afterwards matches the schema before, and that it re-applies.
- Uses stored, or a phone blocked: the revert refuses. Unblock the phone, and decide with the owner what happens to the labels first.

## Monthly and yearly steps

The retention functions are run by hand in the SQL editor, never by a phone or an editor:
`select private.retire_month(date '2026-10-01');` from November 2028, then each month;
`select private.add_months(12);` once a year. See the migration's header.

# Applying signup_hook to the live project

**Applied live on 2026-10-23** (ledger `20261023035741`, check 8/8 true). Anonymous sign-ins fail with 422 on `/auth/v1/signup`
while "Allow new users to sign up" is off, so a phone cannot sign in. Sign-ups
must go on, but first this hook must refuse every sign-up that is not
anonymous, or anyone could make an email account. It adds one function in
`private` and a schema grant; no table or row is touched. Three files, each
pasted whole into the SQL editor as `postgres`:

| File | What it does |
| --- | --- |
| `20261023090000_signup_hook_apply.sql` | One transaction: checks it has not run and `supabase_auth_admin` exists; applies `migrations/20261023090000_signup_hook.sql` (carried unchanged; `verify/signup-hook.sh` checks the copy); calls the function with an anonymous and an email event and checks only `supabase_auth_admin` can run it; writes the ledger row `signup_hook`. Any failed check raises and nothing is changed. A second run stops at the first check and changes nothing. |
| `20261023090000_signup_hook_check.sql` | Read-only, 8 rows, all `ok` should be `t`. Includes calling the function with two sample events. |
| `20261023090000_signup_hook_revert.sql` | One transaction: drops the function, the schema grant and the ledger row. Touches no data. Safe to run twice. |

## Steps, in this order

1. Run `20261023090000_signup_hook_apply.sql`. It ends with `COMMIT`; an error means nothing changed.
2. Run `20261023090000_signup_hook_check.sql`: 8 rows, all `ok = t`.
3. Dashboard, Authentication, Hooks: add a "Before User Created" hook, type Postgres, function `private.before_user_created`, then save.
4. Only then: Authentication, Sign In / Providers, turn on "Allow new users to sign up" and save.
5. Test:
   - a contributor save works from the contributor page (anonymous sign-in succeeds);
   - an email sign-up is refused. With CAPTCHA on, the call needs a Turnstile token, so this one is refused for want of it even without the hook; the hook is proved by step 2's check and by the phone signing in. To exercise the hook alone, test on a project with CAPTCHA off, or read the Auth logs. The call, expecting 403 and "Sign-ups are closed. Contributors sign in anonymously.":

         curl -s -X POST "$SUPABASE_URL/auth/v1/signup" -H "apikey: $PUBLISHABLE_KEY" -H "Content-Type: application/json" -d '{"email":"nobody@example.com","password":"a-long-test-password-1"}'

## Recovery

- Apply failed: nothing changed. The message names what it found.
- Applied, and something misbehaves: turn "Allow new users to sign up" off, remove the hook under Authentication, Hooks, then run `20261023090000_signup_hook_revert.sql`. Do not run the revert while the hook is still selected: with the function gone every sign-up fails.
- Never turn sign-ups on before the hook is saved: until then an email account can be made.

# Applying contributor_accounts to the live project

A phone's anonymous user becomes an account with the same id, so its uploads are the account's at
once; a phone that signs in to an account made elsewhere hands its anonymous uploads over. This adds
three columns to `contributor` (name, number, when the profile was set), four public functions and a
private token table. No existing row changes, and nothing in the app calls the new functions until the
accounts code ships (`.scratch/contributor-accounts/`). Three files, each pasted whole into the SQL
editor as `postgres`:

| File | What it does |
| --- | --- |
| `20261024090000_contributor_accounts_apply.sql` | One transaction: checks `contribution_use` is in the ledger and none of this exists yet; applies `migrations/20261024090000_contributor_accounts.sql` (carried unchanged; `verify/contributor-accounts.sh` checks the copy); checks `authenticated` cannot select or insert the phone or insert a name, the four functions are definers with a pinned path that only `authenticated` can run, and `private.claim_token` is closed to the API roles; writes the ledger row `contributor_accounts`. Any failed check raises and nothing is changed. A second run stops at the first check and changes nothing. |
| `20261024090000_contributor_accounts_check.sql` | Read-only, 9 rows, all `ok` should be `t`. |
| `20261024090000_contributor_accounts_revert.sql` | One transaction: drops the functions, the token table and the columns, and puts the table-wide grants back. Refuses, changing nothing, while any contributor has a name or number. Contributions already moved by a claim stay where they moved. Safe to run twice. |

The functions (the contract tickets 02 and 04 code against; all raise with the message first):

| Call | Who may call | Answers | Errors |
| --- | --- | --- | --- |
| `set_profile(name, phone)` | an account | nothing; the name is trimmed, 1 to 80 characters; the phone is `+639` and nine digits | `not_signed_in`, `not_an_account` (anonymous caller), `bad_name`, `bad_phone` |
| `get_profile()` | any signed-in user | one row `name, phone, profile_updated_at` (nulls before `set_profile`); zero rows without a contributor row | none |
| `begin_claim()` | an anonymous user | a token (uuid), good 10 minutes; its earlier unused tokens stop working | `not_signed_in`, `not_anonymous` (an account called it) |
| `finish_claim(token)` | an account | how many contributions moved; the same token again by the same account answers 0 | `not_signed_in`, `not_an_account`, `bad_token` (unknown, used by another account, or its anonymous user has since become an account), `token_expired` |

Name and phone: an editor's reads of `contributor` show the name and never the phone (column
privileges); an account reads its own phone only through `get_profile()`. The weekly backup role
reads the whole table, phone included, as it reads all of it (encrypted, `backup.yml`).

## Steps, in this order

1. Run `20261024090000_contributor_accounts_apply.sql`. It ends with `COMMIT`; an error means nothing changed.
2. Run `20261024090000_contributor_accounts_check.sql`: 9 rows, all `ok = t`.
3. Regenerate `src/shared/types/database.types.ts` in the classic format, and record the
   ledger version (`select version from supabase_migrations.schema_migrations where name = 'contributor_accounts'`) in `migrations/README.md`.
4. Dashboard, Authentication, Sign In / Providers, Email: on, **Confirm email off** (closed testing,
   no verification). Authentication, Policies: minimum password length 8. Keep anonymous sign-ins and
   CAPTCHA on: the upgrade path needs both.

Applying this alone changes nothing a phone can see. The accounts code (tickets 02 to 04 and 06) goes to
`main` only after steps 1 to 4.

## Recovery

- Apply failed: nothing changed. The message names what it found.
- Applied, and nobody has a name or number yet: run `20261024090000_contributor_accounts_revert.sql`. `verify/contributor-accounts.sh` checks the schema afterwards matches the schema before, and that it re-applies.
- Profiles stored: the revert refuses. Decide with the owner what happens to the names and numbers first.

# Applying am_i_editor to the live project

The studio asks, right after a sign-in or a restored session, whether the account is on the editor
list, and signs a contributor's account out of the studio with a notice. This adds one function,
`public.am_i_editor()`: security invoker over 0005's `private.is_editor()`, about the caller alone,
callable by `authenticated` only. No table, no policy, no row. Three files, each pasted whole into
the SQL editor as `postgres`:

| File | What it does |
| --- | --- |
| `20261030090000_am_i_editor_apply.sql` | One transaction: checks it is not in the ledger yet, that `private.is_editor()` exists and that `authenticated` can run it (usage on `private`, execute on the function: the new function runs as the caller); applies `migrations/20261030090000_am_i_editor.sql` (carried unchanged; `verify/am-i-editor.sh` checks the copy); writes the ledger row `am_i_editor`. A failed check raises and nothing is changed. A second run stops at the first check and changes nothing. |
| `20261030090000_am_i_editor_check.sql` | Read-only, 6 rows, all `ok` should be `t`. |
| `20261030090000_am_i_editor_revert.sql` | One transaction: drops the function and its ledger row. Touches no data. Safe to run twice. |

## Steps

1. Run `20261030090000_am_i_editor_apply.sql`. It ends with `COMMIT`; an error means nothing changed.
2. Run `20261030090000_am_i_editor_check.sql`: 6 rows, all `ok = t`.
3. Regenerate `src/shared/types/database.types.ts`, and record the ledger version
   (`select version from supabase_migrations.schema_migrations where name = 'am_i_editor';`) in
   `migrations/README.md`.
4. Sign in to the studio as yourself: you get in as before. A contributor's account is now told it
   is not an editor and signed out of the studio (the contributor page keeps its own session).

Until step 1 the studio cannot ask (the function is missing), and lets every account in as before,
with a console warning; row security refuses a non-editor's writes either way.

## Recovery

- Apply failed: nothing changed. The message names what it found.
- Applied, and the studio turns away someone it should not: run
  `20261030090000_am_i_editor_revert.sql`. The studio then lets every account in again, as before
  (`verify/am-i-editor.sh` checks the schema afterwards matches the schema before, and that it
  re-applies). Before reverting, check the account is in `private.editor`.

# Applying account_stats to the live project

The numbers for the contributor's Account page, ready before the page is designed (nothing shows
them yet). Each saved ride keeps its walked and ridden metres and seconds; each contributor's
lifetime numbers survive the 24-month retirement; `public.get_my_stats()` gives the signed-in
contributor their own, in one row. Three files, each pasted whole into the SQL editor as `postgres`:

| File | What it does |
| --- | --- |
| `20261031090000_account_stats_apply.sql` | One transaction: checks `contributor_accounts` is in the ledger (`finish_claim` and `retire_month` exist) and none of this exists yet; applies `migrations/20261031090000_account_stats.sql` (carried unchanged; `verify/account-stats.sh` checks the copy); checks `get_my_stats` and `finish_claim` are definers with a pinned path that only `authenticated` can run, the private helpers and `private.contributor_retired_totals` are closed to the API roles, and `save_contribution` still runs as the caller; writes the ledger row `account_stats`. Any failed check raises and nothing is changed. A second run stops at the first check and changes nothing. |
| `20261031090000_account_stats_check.sql` | Part one adds test phones, an account and rides, proves the behaviour (the split saved and refused, each user's own stats only, anon refused, a hidden ride left out, retiring a 2024 test month leaves every number the same and carries nothing twice, a deleted ride no longer counts, a claim moves the retired totals), and rolls all of it back; it raises `FAILED: ...` on the first wrong result. Part two is read-only: 9 rows, all `ok` should be `t`. |
| `20261031090000_account_stats_revert.sql` | One transaction: drops `get_my_stats`, the helpers, the table and the four columns, and puts `save_contribution`, `retire_month` and `finish_claim` back as their migrations made them. Refuses, changing nothing, while any contribution holds a split or any contributor has retired totals. Safe to run twice. |

## Order

1. `contributor_accounts` first: the apply refuses without it.
2. This migration, **before** the app that sends `walk_m`, `ride_m`, `walk_s` and `ride_s` ships.
   Today's `save_contribution` reads only the keys it names and ignores the rest, so that app saves
   either way; applied late, its rides saved in between simply keep no split (null).
3. Apps already in the field keep saving after it: the four keys are optional, and a missing one is
   stored as null.

## Steps

1. Run `20261031090000_account_stats_apply.sql`. It ends with `COMMIT`; an error means nothing changed.
2. Run `20261031090000_account_stats_check.sql`: part one ends with `ROLLBACK` and no `FAILED`;
   part two gives 9 rows, all `ok = t`.
3. Regenerate `src/shared/types/database.types.ts`, and record the ledger version
   (`select version from supabase_migrations.schema_migrations where name = 'account_stats';`) in
   `migrations/README.md`.

The monthly `select private.retire_month(...)` is run as before; it now adds each contributor's
numbers for the month to their retired totals first.

## Recovery

- Apply failed: nothing changed. The message names what it found.
- Applied, and no ride has a split and nobody has retired totals yet: run
  `20261031090000_account_stats_revert.sql`. `verify/account-stats.sh` checks the schema afterwards
  matches the schema before, and that it re-applies.
- Splits or retired totals stored: the revert refuses. Decide with the owner first: dropping them
  loses numbers that cannot be made again.

# Applying delete_my_account to the live project

Account settings → Delete account. This adds one function, `public.delete_my_account()`: a
definer with a pinned path, callable by `authenticated` only. It deletes the caller's own auth user
(`auth.uid()`); the foreign keys already in place take their contributor row, contributions with
their points, hintos and uses, retired totals and claim tokens with it. It refuses an anonymous
phone, an editor (the owner removes editors) and an account that still owns rows of the map. No
table, no policy, no row changes. Three files, each pasted whole into the SQL editor as `postgres`:

| File | What it does |
| --- | --- |
| `20261031100000_delete_my_account_apply.sql` | One transaction: checks `account_stats` is in the ledger, this is not, `private.is_account()` and `private.is_editor()` exist, and `postgres` may delete from `auth.users`; applies `migrations/20261031100000_delete_my_account.sql` (carried unchanged; `verify/delete-my-account.sh` checks the copy); checks the function is a definer with a pinned path for `authenticated` only; writes the ledger row `delete_my_account`. Any failed check raises and nothing is changed. A second run stops at the first check and changes nothing. |
| `20261031100000_delete_my_account_check.sql` | Part one adds five test users with a row in every table, proves an account deletes itself and only itself with every row of theirs, that anon cannot call it, and that an anonymous phone, an editor and an owner of a map row are refused and keep everything, then rolls all of it back; it raises `FAILED: ...` on the first wrong result. Part two is read-only: 4 rows, all `ok` should be `t`. |
| `20261031100000_delete_my_account_revert.sql` | One transaction: drops the function and its ledger row. Accounts already deleted stay deleted. Safe to run twice. |

## Steps

1. `account_stats` first: the apply refuses without it.
2. Run `20261031100000_delete_my_account_apply.sql`. It ends with `COMMIT`; an error means nothing changed.
3. Run `20261031100000_delete_my_account_check.sql`: part one ends with `ROLLBACK` and no `FAILED`;
   part two gives 4 rows, all `ok = t`.
4. Regenerate `src/shared/types/database.types.ts`, and record the ledger version
   (`select version from supabase_migrations.schema_migrations where name = 'delete_my_account';`) in
   `migrations/README.md`.

Apply it before the app's Delete account ships: until then the call answers that the function does
not exist, and nothing is deleted.

## Recovery

- Apply failed: nothing changed. The message names what it found.
- Applied, and Delete account must be withdrawn: run `20261031100000_delete_my_account_revert.sql`.
  `verify/delete-my-account.sh` checks the schema afterwards matches the schema before, and that it
  re-applies. An account already deleted cannot be brought back.
