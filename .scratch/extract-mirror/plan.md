# Our own copy of the Philippines extract: the plan

Written 2026-11-24, before any code. Nothing is built: the owner chooses, then one small PR per change.

**Update, 2026-11-24:** the owner is setting up option B's storage today, with these names. They replace the names further down:
- **Bucket:** a new, separate R2 bucket **`para-osm`** in the Para account, holding only the OSM extract. `parapo-tiles` stays private, and the tiles Worker is untouched.
- **Public read:** through the custom domain **`osm.para-commute.org`**. PR runs and builds read by URL, with no keys.
- **Write token:** Object Read & Write, scoped to `para-osm` only.
- **Secrets:** a GitHub Environment **`osm-mirror`** (deployment branches `staging` and `main`) holds `OSM_R2_ENDPOINT`, `OSM_R2_ACCESS_KEY_ID`, `OSM_R2_SECRET_ACCESS_KEY` and `OSM_R2_BUCKET`, as `tiles.yml` does.
- **Object keys:**
  - `philippines-latest.osm.pbf`, Geofabrik's **whole** file, not a cut. That keeps its header timestamp, so the landmarks build reads its date as it does today. It costs about 0.6 GB of storage, still far inside the free tier.
  - `philippines-latest.osm.pbf.md5`, Geofabrik's own.
  - **`philippines-latest.json`**: the source URL, Geofabrik's `Last-Modified`, the header timestamp, the bytes and the md5. The tiles build takes its extract date from it. R2's public URL answers with the upload's `Last-Modified`, not Geofabrik's, so the date can't travel in a header.

## Why

On 2026-11-23 Geofabrik failed GitHub's runners four ways in one day:

| Time (UTC) | What happened |
| --- | --- |
| 05:30 and ~05:40 | 404 on the old flat address |
| ~06:00 | No connection at all |
| 13:54 | A download that hung for 20 minutes |
| 16:36 | About 0.5 MB/s: 121 MB of 615 MB in three 3-minute tries |

The same file came in under a minute at 12:00 and 13:20. Two builds depend on it:
- the monthly landmarks build (`scripts/landmarks/build.sh`: landmarks, footbridges, establishments and now Overture's road filter);
- the monthly tiles build (`scripts/tiles/build.sh`, still on the old address, which 404s; due before 2026-12-03).

## What the builds need from the file

| Build | Reads | Uses the file's date from |
| --- | --- | --- |
| Landmarks (`scripts/landmarks/build.sh`) | The whole extract, cut to the panning box 120.6,13.6,121.5,15.05 with osmium | The PBF header (`osmium fileinfo`, `header.option.timestamp` or the replication timestamp) |
| Tiles (`scripts/tiles/build.sh`) | The whole extract, through Planetiler `--bounds` (the same box, `scripts/tiles/area.mjs`) | The HTTP `Last-Modified` header of the download |

**Both checksum it against its `.md5`.** Both only ever use the panning box.

## The sources, as read on 2026-11-24

| Source | File | Size | Checksum | Date |
| --- | --- | --- | --- | --- |
| Geofabrik | `asia/philippines/philippines-latest.osm.pbf` | 586 MB | `.md5` beside it | Daily, by its dated list. The page states no cadence, no mirrors, no rate limit |
| openstreetmap.fr | `extracts/asia/philippines.osm.pbf` (and `-latest`) | 675 MB | `.md5` and `.state.txt` beside it | 23-Nov-2026 00:29 in the listing |
| openstreetmap.fr, by region | `extracts/asia/philippines/<region>.osm.pbf` | Metro Manila 59 MB, CALABARZON 106 MB, Central Luzon 97 MB | `.md5` and `.state.txt` each | 17 or 23-Nov-2026 |

Sources: https://download.geofabrik.de/asia/philippines.html, https://download.openstreetmap.fr/extracts/asia/ and https://download.openstreetmap.fr/extracts/asia/philippines/.

**A smaller cut?** Metro Manila alone isn't enough. The panning box reaches into Bulacan, Pampanga and Bataan (Central Luzon), and into Rizal, Cavite, Laguna and Batangas (CALABARZON). The study found exactly that gap (README question 7, which moved us to the whole country). Those three regions together are 262 MB, but they'd have to be merged with `osmium merge`, three downloads and three checksums. That's more moving parts than one file. The mirror below holds the box only, which is smaller than any of these (see option B).

## The options

**A. A second source, no R2.** In both builds, try Geofabrik with the time caps (#1171's `fetch_failed`, about 11 minutes at worst). If that fails, try openstreetmap.fr's `philippines.osm.pbf` with its `.md5`.
- **Gains:** no new secrets, buckets or owner steps. PR runs work as they do now. Two independent servers rarely fail together.
- **Costs:** still depends on outside servers on every run. On a bad day the job spends up to ~11 minutes on Geofabrik before the second source. openstreetmap.fr's extract is 675 MB, built on its own day, so the extract date written into the files differs slightly.

**B. Our copy in R2, weekly (the hub's outline).**
1. **The copy job:** a new weekly workflow (`extract-mirror.yml`):
   - downloads Geofabrik's file and `.md5` (with option A's openstreetmap.fr fallback), checks the md5, and cuts it to the panning box with osmium (`osmium extract -b`, about 300 MB by the study's sizes);
   - uploads the box, its md5 and a small `current.json` holding the source URL, the extract's header timestamp, Geofabrik's `Last-Modified`, the bytes and the md5;
   - if both sources fail, it fails and leaves last week's copy in place. Time limits: `--connect-timeout 30`, `--max-time 180` per try, `--retry 2`, as in #1171, and a 30-minute job timeout.
2. **Both builds read our copy first and fall back to Geofabrik.**
   - **Landmarks** takes its date from `current.json`'s `extract_at` on the mirror path. A cut does **not** keep the header timestamp: tried here with osmium 1.16, `osmium extract -b` writes no `header.option.timestamp`, even with `--output-header=timestamp=…`. So the copy job reads the timestamp from Geofabrik's file before cutting and records it. On the Geofabrik fallback, the build reads the header as it does today.
   - **Tiles** takes its date from `current.json`'s `last_modified` instead of the HTTP header. One line in `scripts/tiles/build.sh`.
   - **The md5 check stays:** each build checks the copy against the md5 the copy job wrote, computed after the cut. The original Geofabrik md5 is checked in the copy job, before the cut. **(d) is answered:** the checksum is checked at both ends, and the date travels in `current.json`, written from the original file's header and `Last-Modified`.
3. **This also replaces** the tiles build's old-address fix: its fallback uses the new address.

## B's three questions

**(a) Can the existing bucket and token hold it?**
- **The tiles Worker wouldn't serve it.** `workers/tiles/src/app.ts` answers only:
  - `/{z}/{x}/{y}.pbf` (from the archive `current.json` names);
  - `/styles/{name}`;
  - keys under `assets/` (`workers/tiles/src/assets.ts`, `ASSETS_PREFIX`);
  - `/health`.
  A key under a new prefix, `extracts/`, matches none of them.
- **The token:** `TILES_R2_*`, "Object Read & Write" scoped to the bucket (`tiles.yml`'s header), can write `extracts/` as it writes `tiles/`.
- **But that token lives in the Environment `tiles`,** which only `staging` and `main` may use. A weekly scheduled job on the default branch can use it. PR runs can't (see (b)).
- So yes: same bucket `parapo-tiles`, prefix `extracts/philippines/`, no new token. A separate bucket is only needed for (b).

**(b) How PR runs read it without secrets.** Cloudflare's public-bucket page describes public access only per bucket: "Expose your bucket as a custom domain under your control" or an `r2.dev` subdomain, the latter "rate-limited and should only be used for development purposes". It says nothing of per-object or per-prefix access. So exposing `parapo-tiles` would expose the whole bucket: tiles, styles and the archives.

That rules it out. Two ways that expose nothing else:
1. **A separate bucket, `para-osm-extract`, public through a custom domain**, `extract.para-commute.org` (a zone in the same account). It holds only the box extract, its md5 and `current.json`: ODbL open data.
   - It needs its own R2 token, Object Read & Write on that bucket alone, stored as new secrets in an Environment `extract`.
   - Builds read the public URL with no secret, so PR runs, schedules and dispatches all work alike.
2. **PR runs keep reading Geofabrik with option A's fallback,** and only scheduled and dispatched runs use the private copy through `tiles`' token.
   - Nothing becomes public.
   - But PR runs, like #1171's, stay exposed to Geofabrik's bad days.

Recommended: **B with the separate public bucket (1).** It's the only way PR runs stop depending on Geofabrik, and nothing but open data becomes public.

**(c) R2 free tier,** from https://developers.cloudflare.com/r2/pricing/ (read 2026-11-24, page dated 2026-10-30):
- "Storage | 10 GB-month / month"
- "Class A Operations | 1 million requests / month"
- "Class B Operations | 10 million requests / month"
- "Egress (data transfer to Internet) | Free"
- "The free tier only applies to Standard storage."

Beyond it, $0.015/GB-month and $4.50 / $0.36 per million Class A / B. Our use:
- **Storage:** one box extract, about 0.3 GB. Keep only the latest copy: a new upload replaces the old.
- **Writes:** about 4 Class A operations a week (three objects plus a list).
- **Reads:** a few Class B a month. Downloads are egress, which is free.

That's well inside the free tier, alongside the tiles' own use.

**(e) Bytes:** 0 B to any page. It's a new workflow, two build scripts and possibly a docs page. No `src/` change.

## The owner's steps (B with the public bucket)

1. **Create the bucket.** R2 → Create bucket → `para-osm-extract` (Standard storage).
2. **Make it public.** Bucket → Settings → Custom Domains → Add → `extract.para-commute.org`. Leave "Public Development URL" off.
3. **Make its token.** R2 → Manage API tokens → Create: Object Read & Write, that bucket only.
4. **Store the secrets.** GitHub → Settings → Environments → New `extract`, limited to `main` and `staging`. Add `EXTRACT_R2_ENDPOINT`, `EXTRACT_R2_ACCESS_KEY_ID`, `EXTRACT_R2_SECRET_ACCESS_KEY` and `EXTRACT_R2_BUCKET`.
5. **Fill it once.** After the copy-job PR merges, Actions → Extract mirror → Run workflow.
6. **Check it.** `curl -sI https://extract.para-commute.org/philippines/current.json` should answer `200`.

## The PRs, in order (each merges alone where it touches `.github`)

1. **The copy job:** `extract-mirror.yml` and `scripts/extract/mirror.sh` (download, check, cut, upload, `current.json`), with unit checks for `current.json`'s shape. The owner's steps 1–5 follow its merge.
2. **Landmarks reads the copy:** `scripts/landmarks/build.sh` tries `extract.para-commute.org` first, checks the md5 and date, then falls back to Geofabrik and openstreetmap.fr. Unit checks of the URL and fallback order.
3. **Tiles reads the copy:** `scripts/tiles/build.sh` the same way, taking the date from `current.json`. This replaces the old-address fix. Its merge into staging triggers a tiles upload run (`tiles.yml`, push to staging with `scripts/tiles/**`), so it merges at a time the owner picks, before 2026-12-03.

If the owner prefers **A only**, it's one PR per build script, with no owner steps.

## Questions for the owner

1. **A, B with the public bucket, or B private** (PR runs on Geofabrik)? Recommended: B, public bucket.
2. **The copy's cadence:** weekly (the hub's outline), or daily like Geofabrik? Weekly is enough for monthly builds.
3. **The domain:** `extract.para-commute.org`, or another name?
