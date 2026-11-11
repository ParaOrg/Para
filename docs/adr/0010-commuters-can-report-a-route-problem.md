---
status: proposed
date: 2026-11-11
---

# Commuters can report a route problem

[ADR 0001](0001-commuters-read-a-published-file.md) and [ADR 0004](0004-location-leaves-the-phone-only-by-choice.md)
promised that the public map sends nothing. The owner wants commuters to be able to tell editors when a route
is wrong: it turns somewhere else now, it stopped running, the fare changed (Q158). A report is the one thing
the public map may send, and only when the commuter chooses to send it.

## Decision

Design B of Q158. The public map posts a report to a Cloudflare Worker at its own origin, `/api/report`. The
Worker calls one database function, `report.submit_route_report`, over a Postgres connection, as a role that may run
that function and nothing else. The page never talks to the database.

**What a report holds:** the route, optionally its direction (the way showing), its kind, the commuter's
words, when it came, and what an editor did with it (open, done or dismissed; who and when). The kind is one of
`wrong_line`, `wrong_fare`, `wrong_stop`, `wrong_signboard`, `no_longer_runs` or `other` (Q150). The words are
optional, up to 500 characters, and required for `other`. Nothing else, by the owner's rule:

- **No IP address**, not even hashed: not in the table, not in the Worker's logs.
- **No location**, no device id, no account, no cookie. The table has no column that could hold one, and the
  check proves the columns are exactly these.

**The public page:**

- Posts only to `/api/report` on its own origin. It holds no database address, no key and no Supabase client.
  `scripts/checks/check-build.mjs` still proves no `.supabase.co` reaches it.
- Shows Cloudflare Turnstile before a report goes, as the contributor page does.

**The Worker:**

- Verifies the Turnstile token itself, with Cloudflare's siteverify, before anything else.
- Rate-limits itself with the Workers Rate Limiting binding, not only with a zone WAF rule. The binding's key
  is not stored anywhere.
- Never logs a request body, a header that names the sender, or the address it came from.
- Holds the connection string as a Worker secret the owner sets. Its name and where to set it come with the
  Worker's own change. The string is for the role `report_sender` through Supabase's transaction pooler.
- Accepts a POST of JSON only, checked with the same Zod schema the page uses (one shared module).
- Maps the function's one-word answer (sent, bad_kind, bad_note, unknown_route, busy, route_full, full) to an HTTP status
  and a short message. It never passes a database error through.

**The database** (`supabase/migrations/20261111100000_route_report.sql`):

- `public.route_report`, with row security on. Editors read reports and set only their status. A trigger fills
  in who resolved a report and when (`resolved_by`, `resolved_at`). There is no insert policy and no delete policy, so nobody inserts or deletes
  through the API.
- `report.submit_route_report`, security definer with an empty `search_path`, in the schema `report`. The REST API does
  not expose that schema. The function is revoked from public, anon and authenticated, and only
  `report_sender` may run it.
- `report_sender` has a limit of 5 connections and a 5-second statement timeout, and no other grant. It cannot
  log in until the owner gives it a password, by hand, never in the repo.
- Caps, enforced in the function under one lock so concurrent reports cannot race past them:
  - 20 reports a route in any rolling day;
  - 30 in any minute;
  - 2,000 in any day;
  - 50,000 rows in all.

  A row is under 1 kB, so the reports can never take more than about 50 MB of the free tier's 500 MB.

## Consequences

- ADR 0001 and ADR 0004 now read: the public map sends nothing except a report the commuter chooses to send,
  holding no location or identity. Commuters still never read the database.
- Reports need the database awake. If it is paused or down, the Worker says the report could not be sent, and
  the map itself keeps working.
- At 50,000 rows reports stop until old ones are cleared. Retention is an owner follow-up: whether and when
  done and dismissed reports are cleared, and how long to keep them (`.scratch/route-reports/README.md`).
- Abuse is limited at three layers: Turnstile, the Worker's rate limit and the function's caps. The caps are
  the floor: they hold even if the Worker's checks are bypassed or misconfigured.
- What a commuter writes may name a person or a place. The words are shown to editors only, never published.

## Open

- **D4: how the Worker reaches Postgres.** Either a direct TCP connection to the transaction pooler from the
  Worker (the plan), or Cloudflare Hyperdrive in front of it. Hyperdrive is an option only, not assumed. It
  would pool connections and cut latency, at the cost of one more service holding the connection string.

## Rejected

- **The page calling Supabase directly** (design A), with anon allowed to insert. That puts the database
  address in the public page, breaks ADR 0001's promise and the build guard, and leaves the caps to row
  security alone.
- **Storing a hashed IP to rate-limit in the database.** The owner's rule forbids it, and the Worker's
  binding does the per-sender limiting without keeping anything.
