# para (the site's Worker)

The Worker that serves the site, `para` (`wrangler.jsonc` at the repo root). Every address is served from
`dist/` as before. Only `/api/*` runs this script (`run_worker_first`), and it answers one address:
`/api/report`, a commuter's route report (ADR 0010, `.scratch/route-reports/README.md`).

## /api/report

A POST of JSON, checked in this order:

1. **Method and type:** only a POST of JSON is read. Anything else is 405 or 415.
2. **Rate limit:** the `REPORT_LIMIT` binding allows 5 reports a minute from one sender, or 429 `too_many`.
   The sender's address is passed only to that binding, in Cloudflare's memory. It is never stored or logged
   (Q196).
3. **Size:** a body over 4 KB is 413.
4. **Shape:** the same schema the page uses (`src/features/routes/model/route-report-schema.ts`), or 400
   `bad_request`.
5. **Turnstile:** checked with Cloudflare's siteverify, or 403 `not_verified`. The sender's address is not sent.
6. **The database:** `report.submit_route_report`, connected as `report_sender` with the `postgres` driver.
   - Its answer comes back as the code, with its status:
     - `sent` 201;
     - `bad_kind`, `bad_note`, `unknown_route` 422;
     - `busy`, `route_full` 429;
     - `full` 503.
   - If the database cannot be reached, the answer is 503 `unavailable`.

Nothing logs the body, the token or the database's error.

## The owner's steps

These run only after the route_report migration is applied (`supabase/apply/README.md`, "Applying route_report",
steps 1–4).

1. **Give the role a password** in the Supabase SQL editor. Use a long random one, and never put it in a file:
   `alter role report_sender with login password '<generated>';`
2. **Copy the connection string:** Supabase → Project Settings → Database → Connection string → **Transaction
   pooler** (port 6543). Put `report_sender.<project-ref>` in place of the user, and the password from step 1.
   For example: `postgresql://report_sender.<project-ref>:<password>@<region>.pooler.supabase.com:6543/postgres`.
3. **Set the two secrets** on the Worker: Cloudflare → Workers & Pages → **para** → Settings → Variables and
   Secrets → **Add**, type **Secret**, for production. Set the same pair on the staging environment if staging
   should take reports.
   - `REPORT_DATABASE_URL`: the string from step 2.
   - `TURNSTILE_SECRET_KEY`: the secret key of the Turnstile widget whose site key the public page uses
     (Cloudflare → Turnstile → the widget → Settings).
4. **Deploy** (the next push to the branch does it), then check:
   `curl -s -X POST https://para-commute.org/api/report -H 'content-type: application/json' -d '{}'`
   should answer `{"code":"bad_request"}`. Until both secrets are set, every report answers 503
   `unavailable`, and the rest of the site is unaffected.

To stop reports at once without a deploy: `alter role report_sender nologin;` in the SQL editor. Reports then
answer `unavailable`.

**D4 (open): Hyperdrive.** The Worker connects to the pooler directly. Hyperdrive in front of it is an option,
not set up.

## Run the checks

From the repo root:

- `npm run typecheck`, which includes `tsc -p workers/site`;
- `npm run test:unit`, which runs `tests/unit/report-worker-test.mjs`, `report-stand-in-test.mjs` and
  `route-report-schema-test.mjs`;
- `npm run check`.

`tests/e2e/report-stand-in.mjs` serves this handler on a loopback address for the commuter's report tab's suite.
