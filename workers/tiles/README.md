# parapo-tiles

ParaPo's own map: a Cloudflare Worker that serves the vector tiles, the three base styles, the sprite and the glyphs from the R2 bucket `parapo-tiles`. It replaces `tiles.openfreemap.org` (`.scratch/own-tiles/spec.md`). The site (`wrangler.jsonc` at the repo root, `src/`) is not touched by it.

Plain TypeScript with no npm imports: Cloudflare bundles it, so nothing is added to the app's `package.json`.

## What it answers

| Request | Answer |
| --- | --- |
| `GET /{z}/{x}/{y}.pbf` | The tile, read by byte range from the PMTiles file `tiles/current.json` names, gzip as stored. `204` if the file holds no such tile, `400` for an address that is no tile. |
| `GET /styles/{positron\|liberty\|fiord}` | The original style from `assets/styles/<name>.json`, rewritten to this Worker's own address: our tiles, our sprite and glyphs, no `natural_earth` raster. |
| `GET /assets/...` | A sprite or glyph file from `assets/...` in the bucket, as it is. |
| `GET /health` | `{ builtAt, file, tiles }` from `current.json`. |

Bucket layout (written by the monthly build, `.scratch/own-tiles/issues/02-monthly-build-to-r2.md`; the names are in `src/keys.ts`): `tiles/current.json`, `tiles/parapo-YYYY-MM-DD.pmtiles`, `assets/styles/*.json`, `assets/sprites/...`, `assets/fonts/...`.

**Caching.** Tiles, styles and assets all go through the Cache API (a style is keyed by the build and the address it is asked on, an asset by the build and its path). Tiles: `public, max-age=86400, stale-while-revalidate=604800`, with the file's name as the ETag, so a new monthly build changes every tile's address in the cache. `current.json` is read at most every 5 minutes per Worker instance. The Cloudflare Cache API stores tiles and leaf directories, but only on a custom domain: on `workers.dev` it keeps nothing, so every tile there is a read from R2.

**CORS.** Allowed: `https://parapo.para-ph-info.workers.dev`, `https://staging-parapo.para-ph-info.workers.dev`, any `https://<name>-parapo.para-ph-info.workers.dev` preview, the same three on `villaralvorovic2.workers.dev` (kept while the site moves accounts; a later change removes them), `http://localhost:5173`, and the comma-separated `EXTRA_ORIGINS` in `wrangler.jsonc` (`https://www.para-commute.org` and `https://para-commute.org`, the site's own domain). A request with no `Origin` is served. Any other origin gets `403` and no CORS headers.

**Custom domain.** The Worker answers at `https://tiles.para-commute.org` (Settings → Domains & Routes → Custom domain), which is what turns the edge cache on. The `workers.dev` address keeps working.

**Rate limit.** Not in the Worker. It is a Cloudflare rate-limiting rule on the `para-commute.org` zone (Security → WAF → Rate limiting rules), an owner step in the dashboard; `workers.dev` has none.

## Deploy (the owner's steps)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → choose **ParaOrg/Para**.
2. Name the Worker `parapo-tiles`. Set the **root directory** to `workers/tiles`.
3. Set the **deploy command** to `npx wrangler@4 deploy`. Leave the build command empty.
4. Save and deploy. The R2 binding is already in `wrangler.jsonc`: `TILES` → the bucket `parapo-tiles`. In the Worker's **Settings → Bindings** it should show as an R2 bucket. If the bucket has another name, change `bucket_name` in `wrangler.jsonc`.
5. Open `https://parapo-tiles.<account>.workers.dev/health`. It answers once the first monthly build has put `tiles/current.json` in the bucket; before that it says the tiles are unavailable (`503`).
6. Check a tile is gzipped once, not twice. Take any tile address the file holds, for example Quiapo at zoom 14:
   `curl -s https://parapo-tiles.<account>.workers.dev/14/13698/7520.pbf | gunzip | head -c 20`
   should print readable protobuf text (layer names such as `water`), not binary that starts `1f 8b` again. The Worker marks tiles `encodeBody: 'manual'` so Cloudflare does not compress them a second time.
7. For the tiles subdomain: Worker → **Settings → Domains & Routes** → **Add** → **Custom domain**. That is also what turns the edge cache on.

## Run the checks

From the repo root: `npm run test:unit` (the `tests/unit/tiles-worker-*` files), `npm run typecheck` (the Worker has its own `tsconfig.json`, WebWorker types, no DOM), and `npm run check`.
