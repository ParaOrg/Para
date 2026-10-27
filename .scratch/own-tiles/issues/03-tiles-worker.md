# 03: The tiles Worker on our subdomain

Status: needs-info (owner: the tiles subdomain, approval of a new Worker)
Type: task
Who: Sonnet
Blocked by: 01

## What to build

A Cloudflare Worker, separate from the site (the site stays static assets, `wrangler.jsonc`), on the tiles subdomain:

- `/{z}/{x}/{y}.pbf` reads the tile from the PMTiles file `current.json` names in R2 (byte-range reads), and answers with long cache headers keyed by the file's version;
- the styles, sprites and glyphs from R2 as they are;
- each response cached at the edge (Cache API), so R2 is read about once per tile per location;
- CORS for ParaPo's origins only (production, staging, branch previews); other origins refused;
- a rate limit per client, and a `/health` answer with the file's build date.

Read the PMTiles spec from the Protomaps docs; a small reader in the Worker is fine. No new dependency in the app's `package.json`; anything the Worker needs is asked of the hub first.

## Files it owns

`workers/tiles/` (its own `wrangler.jsonc`), the README lines.

## Acceptance checks

- On a preview of the Worker: a tile, a style, a glyph and `/health` answer; a second request for a tile is a cache hit; a request from another origin is refused.
- Response times, cold and cached, written under `## Comments`.

## Comments
