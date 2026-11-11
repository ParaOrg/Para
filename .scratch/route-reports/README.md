# Route reports

A commuter on a trip taps a flag, which opens a report tab, and reports a problem with that route. The owner
designs the tab; it is not built yet. Decided in Q144, Q150–156 and Q158 (design B), relayed by the hub on
2026-11-11. The decision record is [ADR 0010](../../docs/adr/0010-commuters-can-report-a-route-problem.md).

## What a report holds

- `route_id`, required.
- `direction_id`, optional: the way showing.
- `kind`, required, one of `wrong_line`, `wrong_fare`, `wrong_stop`, `wrong_signboard`, `no_longer_runs`, `other`
  (Q150: "a types list + a 500-char note").
- `note`, optional, at most 500 characters, trimmed. Required only for `other`.
- `created_at`.

Nothing else. No IP address (not even hashed), no location, no device id, no account. Anonymous.

## Who and how

- Any commuter, anonymous, behind Turnstile. The page uses the site key the public build already has; the
  Worker verifies the token with the secret.
- The public page posts to its own origin, `/api/report`. The public build never contains `.supabase.co`
  (ADR 0001; `scripts/checks/build/strings.mjs`).

## The Worker (design B), step 2

A Cloudflare Worker route at `para-commute.org/api/report`, with a staging equivalent.

1. Accepts a POST of JSON only, checked with the same Zod schema the page uses (one shared module).
2. Verifies Turnstile server-side.
3. Rate-limits with the Workers Rate Limiting binding (per client per minute), not only a zone WAF rule.
4. Calls `report.submit_route_report` as `report_sender`, a dedicated Postgres login role with EXECUTE on that
   one function and nothing else. Its connection string is a Worker secret the owner sets; tell the hub the
   exact secret name. Never the service role, never in the repo. Hyperdrive is optional (open decision D4):
   mention it, don't assume it.
5. Never logs request bodies. Returns plain success or failure codes.

## The database, step 1 (draft PR #909)

`supabase/migrations/20261111100000_route_report.sql`, with apply, check and revert files. The owner applies it.

- `public.route_report`: `id`, `route_id` (on delete cascade), `direction_id` (on delete set null), `kind`
  (text check), `note` (≤ 500), `created_at`, `status` (open, done, dismissed; default open), `resolved_by`,
  `resolved_at`.
- Row security on. Editors (`private.is_editor()`) select, and update the status; a trigger sets `resolved_by`
  and `resolved_at`. Nobody deletes. No insert policy: inserts come only through the function.
- `report.submit_route_report(route_id, direction_id, kind, note)`: security definer, `search_path ''`, in the
  schema `report`, which the REST API does not expose. Revoked from public, anon and authenticated; granted only
  to `report_sender`. Validates its inputs. Answers `sent`, `bad_kind`, `bad_note`, `unknown_route`, `busy`,
  `route_full` or `full`.
- Caps: 20 a route in a rolling day, 30 in any minute, 2,000 in any day, 50,000 rows in all, so the 500 MB free
  database cannot fill.

## The studio, step 3

A Reports list for editors:

- newest first, showing the route, the way, the kind, the note and the age;
- Done and Dismiss, which set the status (and with it who resolved it and when);
- an open-count badge if cheap;
- through `features/studio/data/` with TanStack Query (key factory, Zod).

Its look follows the studio's existing list patterns. Anything genuinely new goes on the owner's design list.

## Order

1. ADR and migration: draft PR, the owner applies.
2. Worker, tests and an e2e stand-in.
3. The studio Reports list.

The commuter tab waits for the owner's Figma.

## For the owner

- **Apply step 1** from `supabase/apply/README.md`, "Applying route_report". Its step 5 (the role's password and
  the Worker secret) waits until step 2's Worker exists.
- **Retention:** at 50,000 reports, new ones stop until old ones are cleared. Decide whether and when done and
  dismissed reports are cleared, and how long they are kept.
- **D4:** a direct connection to the transaction pooler, or Hyperdrive in front of it.
