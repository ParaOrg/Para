# Isolated studio review preview

These helpers are development tools, never imported by the application. They use
public sample map data and a disposable Postgres/PostgREST API. They do not accept
a live database URL. The demo signing key authenticates disposable fixtures only.

1. Start Postgres 17 as `parapo-review-db` on a private Docker network, without an
   exposed database port. Run `supabase/verify/run.sh` with an explicit local
   `PSQL="docker exec -i parapo-review-db psql -U postgres"`.
2. Create `parapo_preview` from the verified 0022 database and apply the new
   `20261018112757_reviewed_draft_approval.sql` there. Use the fixture bootstrap's
   editor id. The preview auth.uid stand-in must read PostgREST's JSON JWT claims
   as well as the verification scripts' individual claim setting.
3. Start PostgREST on loopback port 4191 with the `parapo_preview` database and
   the fixture JWT secret. No live credential is used.
4. Copy `src`, `scripts`, `public` and the public `.env.production` into
   `/tmp/parapo-review-publish`, and link its `node_modules` to the workspace.
   Run `reset-review.sh` to create a deterministic dataset.
5. Build Vite to `/tmp/parapo-review-preview` with `VITE_STUDIO_DRAFTS=1`,
   `VITE_SUPABASE_URL=http://127.0.0.1:4180/api`, and a dummy publishable key.
   Start `node scripts/preview/review-server.mjs`.
6. Run `tests/e2e/review-test.mjs` with Playwright and
   `tests/e2e/review-publication-test.mjs` with the repository's TypeScript hook.
   They refuse remote database URLs and mutate only disposable data. The local
   Publish sample action runs the actual publisher in its isolated copy.

For a shareable static preview, build the same UI to `/tmp/parapo-review-hosted`
with the deliberately invalid `https://parapo-isolated-preview.invalid` URL.
`build-static-demo.mjs` injects a browser-local sample adapter into that separate
build; it never modifies the deployed app's entry point. Reset and Publish sample
operate only on that browser's sample cache. The actual SQL and the browser-local
adapter are separate verification targets: the adapter is not proof of SQL behavior.

`asset-manifest.mjs` and `upload-assets.mjs` prepare Cloudflare's documented direct
asset-upload flow. Upload uses a short-lived, asset-scoped token supplied by the
connected Cloudflare API. The sample preview is a separate static Worker; do not
change the existing `parapo` service or any staging/production environment flags.
