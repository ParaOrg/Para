# 08: The contributor tables

Status: ready-for-agent
Type: task
Wave: 3
Who: Sonnet; Opus reviews before the owner sees it
Blocked by: 02, 04, 06, studio-maps/01

## What to build

`supabase/migrations/0019_contributions.sql`, as `../database.md` §3 to §6 describe and as 02 approved them:

- **Tables:** `contributor`, `contribution`, `point_batch` (partitioned by month: every month to December 2028, plus a default piece), `hinto`, `contribution_use`. Columns, checks, keys, and an index on every foreign key.
- **Helpers in `private`:** `can_contribute()`; the insert triggers that stamp the server-owned columns and enforce the caps (§5); `retire_month(month)` and `add_months(n)` (§6). Security definer, search path pinned, every name qualified, EXECUTE revoked from `public` and `anon`.
- **`public.save_contribution(recording jsonb)`:** security invoker, search path pinned, executable by `authenticated` only. One transaction; a resend answers `already saved`.
- **Grants and rules** exactly as §4's table. After 0017, a new table grants nothing by default, so each grant is written out.
- **`drop table gps_session`**, which this replaces (empty, never used).
- **The header:** why each table exists, what a phone may do and why, the caps' numbers, the monthly and yearly steps for the owner (§6), and that it is not applied by the session that wrote it.
- Regenerate the types.

Between the starting numbers in §5 and the field test's results (04), use whichever 02 approved.

## Files it owns

`supabase/migrations/0019_contributions.sql`, the regenerated types. One migration session at a time: it starts after studio-maps/01's migration is applied.

## Acceptance checks

- Written, not applied. After the owner applies it, the audit query (§13) is run and every row it returns is explained; the advisors show nothing new beyond what the header predicts.
- Once anonymous sign-in is on (09), this checklist with two test phones, A and B, and the publishable key alone (no sign-in):
  - A saves a recording: `saved`. A resends it: `already saved`, and nothing doubles.
  - B can't read A's contributions. The publishable key alone reads nothing from any of the five tables.
  - A recording with a step over 150 km/h, a point outside the Philippines, or more than 14,400 points is refused, whole.
  - The 21st recording in 24 hours is refused.
  - An editor blocks A: A's next save is refused. A can't unblock itself.
  - A deletes its recordings: its contributions, points, hintos and uses are gone.
  - `retire_month` on a test month (in a transaction, rolled back) drops the piece, trims the lines, clears the text, unlinks the phone.

## Comments
