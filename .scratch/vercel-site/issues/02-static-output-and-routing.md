# 02: vercel.json: output, routing, build

Status: ready-for-agent
Type: task
Who: Opus
Blocked by: none

## What to build

- `vercel.json` at the root (`$schema` set): `buildCommand: "npm run build:vercel"`, `outputDirectory: "dist"`, `installCommand: "npm ci"`, `framework: null`.
- `redirects` (308) matching what the Worker's `auto-trailing-slash` did: `/index.html` → `/`, `/studio` → `/studio/`, `/contribute` → `/contribute/`, `/app` → `/app/`, `/coming-soon` → `/coming-soon/`, and each `…/index.html` of those to its folder.
- `rewrites`: `{ "source": "/((?!api/).*)", "destination": "/index.html" }`, the single-page fallback, outside `/api/`.
- `package.json`: `"build:vercel": "npm run build && node scripts/vercel/strip-dist.mjs"`. `strip-dist.mjs` deletes `dist/.vite/`, `dist/_headers`, `dist/.assetsignore`, and fails if `dist/index.html` is missing. `npm run build` itself is unchanged, so CI and the guards stay identical.
- `.gitignore`: `.vercel/`.
- A unit check, `tests/unit/vercel-config-test.mjs`: the redirects and the rewrite above, and that no rewrite source names a path that is a file in `public/`.
- Don't touch `wrangler.jsonc` or `public/.assetsignore` (the rollback path, ticket 11).

## Acceptance checks

- [ ] `npm run check` passes; `npm run build:vercel` leaves no `.vite/`, `_headers` or `.assetsignore` in `dist/`.
- [ ] On the first preview (after 07): `/no-such-page` answers the map's page, 200; `/data/no-such.json` answers the map's page, 200, as on Cloudflare; `/api/nope` answers 404; `/studio` answers 308 to `/studio/`; `/.vite/manifest.json` answers the map's page, not the manifest.

## Comments
