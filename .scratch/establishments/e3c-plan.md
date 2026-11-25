# E3c: Overture as a layer of its own, the plan

Step E3c of `.scratch/establishments`. Written 2026-11-23, before any code. Nothing is built.

The owner's answers it rests on (README, "Answers and the build"):
- **Overture yes**, as **its own layer**, never merged into the ODbL file, with its licence and NOTICE texts shipped;
- **confidence ≥ 0.7**;
- **food, cafés, clinics, schools** only, the categories OpenStreetMap is thin on (the study's counts, README §2).

## What it does

From z16 in, with Location Labels on, the map draws Overture's restaurants, cafés, clinics and schools beside OpenStreetMap's. They use the same markers as E1 and E3b, and are read the same way: from Para's own files, only the cells in view. Commuters still reach only Para's files (ADR 0001, 0004, 0007). Only the monthly build in Actions touches Overture's bucket.

## Measured (release 2026-11-18.0, the panning box, the study's download)

Filter:
- `confidence >= 0.7`;
- `operating_status` open;
- these `basic_category` values:

| Kind | Overture categories | Places |
| --- | --- | ---: |
| Food | restaurant, fast_food_restaurant, casual_eatery, food_court | 26,081 |
| Café | coffee_shop, cafe | 5,794 |
| Clinic | dental_clinic, primary_care_or_general_clinic, pediatric_clinic, vision_or_eye_care_clinic, specialized_health_care, health_care, diagnostics_imaging_or_lab_service | 9,622 |
| School | elementary_school, high_school, middle_school, preschool, college_university | 6,601 |
| **Total** | | **48,098** |

A further 1,222 were dropped for no name or an address-like name (starting with a digit, or holding "St.", "Ave.", "Brgy." and so on).

**Files**, in E3a's format (an index plus one file per 0.05° cell, rows `[id, kind, lng, lat, name, {brand?}]`):

| | Value | E3a's ceiling |
| --- | ---: | ---: |
| Cells | 356 | |
| Total, raw | 3.65 MB | 8 MB |
| Total, gzipped | 1.43 MB | |
| Densest cell, raw | 267 kB | 400 kB |

Both fit E3a's ceilings, so the same checks apply. A phone at z16 reads one to four cells, about 10–40 kB gzipped, once per cell hash; the offline worker keeps them.

Not yet measured: the **road-centre-line filter** (README §3: 15% of Overture's points sit on a road's centre line). The build drops a point within 8 m of a `highway=*` line from the same Geofabrik extract E2 already downloads. I expect about 10–15% fewer places, so the sizes above are an upper bound.

## Where it's served: in the repo, like E3a (recommended)

**`public/data/overture/v1/`**: `index.json` and `<col>-<row>.json` cells, beside `public/data/establishments/v1/` but never in it, so the ODbL file stays pure (owner's answer 4).
- They're written by the monthly `landmarks.yml` run, as a pull request like #1148. A run that loses more than 20% of the places is refused, as E3a does.
- **The owner has no steps.** The files deploy with the site, like every other `public/data/` file. No R2 upload, no Worker route, no Worker deploy.
- Each monthly refresh adds about 1.4 MB gzipped to Git history, roughly 17 MB a year. That's acceptable for a repo that already carries the monthly landmark and establishment files. If it grows too much, the alternative below moves it out.

**Alternative: PMTiles in R2, served by the tiles Worker.** Only if the owner prefers to keep the data out of Git.
- tippecanoe (apt, not npm) turns the same points into `overture-places.pmtiles` (the study's z14 trial: 7.4 MB).
- The client would need MapLibre's PMTiles protocol. That's either a new npm dependency (`pmtiles`), which needs the owner's yes, or a hand-written range reader. Both are heavier work than reusing E3b's reader.
- **The owner's steps would be:**
  1. **Upload.** Upload `overture/<release>.pmtiles` and `overture/current.json` to the R2 bucket `parapo-tiles`. They can come from the `tiles.yml` run with its `TILES_R2_*` secrets, or by hand in **R2 → parapo-tiles → Upload**.
  2. **Deploy the Worker.** Deploy `para-tiles` again with a new route, `/overture/{z}/{x}/{y}.pbf`, in `workers/tiles/src/app.ts`, through **Workers & Pages → para-tiles → Deployments**.
  3. **Check it.** `curl -s -o /dev/null -w '%{http_code}' -H 'Origin: https://www.para-commute.org' https://tiles.para-commute.org/overture/16/54800/30070.pbf` should print `200`.

  No new DNS or zone route is needed, because `tiles.para-commute.org/*` already reaches the Worker.

## Proof: 0 B in the opening code

The budget has about 24–70 B left (`SHARED_MAX_GZ_KB = 415` in `scripts/checks/build-weight.mjs`), so E3c must add nothing to it. How:

1. **No change to the opening code's files.**
   - `establishment-loader.ts` is the only establishment file in the opening code. It already imports the establishments' lazy chunk (`establishment-drawing`), and E3c doesn't touch it.
   - `map-view.tsx` and `map-attribution.ts` are untouched too.
2. **Everything new is in the lazy chunk.**
   - A new `establishment-overture.ts` (the layer, its cells, its features) is imported only by `establishment-drawing.ts`.
   - The reader reuses `fetch-establishments.ts`, with its base address passed in: `/data/overture/v1/`.
3. **No new chunk for the lazy chunk to import.** The one way a lazy change reaches the opening code is Vite's preload list for the lazy chunk's imports: that's E3b's +10 B, the `zod` chunk added to it.
   - E3c's code imports only what `establishment-drawing` already imports: `maplibre-gl` types, the kinds, and the reader with its schema.
   - So the preload list stays the same, byte for byte.
4. **The credit costs no opening bytes.** The Overture GeoJSON source carries `attribution: '© Overture Maps Foundation'`. MapLibre's `AttributionControl`, which `map-view.tsx` already builds, adds a source's attribution to the map's corner by itself while the layer is on the map. The string lives in the lazy chunk.
   - The contributor page's Map Data Source sheet, built from `mapCredits()`, wouldn't list it. That page keeps Location Labels off by default. Adding a line there is a follow-up with its own bytes, for the owner to weigh.
5. **The check.** The PR records `build-weight` before and after (as in #1152's table). It must show the opening chunks byte-identical to staging (`maplibre`, `maplibre-gl-shared`, `react`, `zod`, `shared`): a difference of 0 B, not "under budget". If any chunk moves by even 1 B, the PR doesn't go up until it's back to 0.
   - The lazy chunk `establishment-drawing` grows by about 1 kB gzipped: the layer and its features. Its own budget (`build-weight.mjs`, the lazy chunks) has room.

## Licence files

They're shipped in `public/data/overture/v1/`, beside the data, and copied verbatim:

| File | Why |
| --- | --- |
| `LICENSE-CDLA-Permissive-2.0.txt` | Most rows: Meta, Microsoft, Overture's own; 93,206 source entries among the kept places |
| `LICENSE-Apache-2.0.txt` and `NOTICE` | The Foursquare rows (4,680). Apache-2.0 asks for its licence and the source's NOTICE text with any redistribution |
| `README.md` | Which release, which filter, and that rows are from mixed sources under these licences. AllThePlaces rows (758) are CC0-1.0, which needs nothing but is named |

- `index.json` carries the release, the licences and the attribution string, as the establishment index carries ODbL's.
- No row ever enters `public/data/establishments/`. The build writes the two sets in separate steps, and `check.mjs` refuses an Overture id in the OSM cells.

## The look

The same as E1 and E3b, with nothing new to design. The kind's family marker (food orange, health red, education amber), names one zoom closer, `Noto Sans Italic` 11. The italic glyph range is already loaded, so there's no new download.

**Where both sources have the same place,** OSM wins (README §4, "Deduplication"). The build drops an Overture place within 50 m of an OSM place with a matching folded name and a compatible kind, or within 150 m with the same `brand:wikidata`.

The owner may want the Overture markers told apart, for example lighter. That's question 3.

## Tests

- **Unit:**
  - the filter: categories, confidence, address-like names;
  - the road-line drop and the dedup against OSM, on fixtures;
  - the layer's features;
  - the cell schema reused.
- **The guard:** no Overture id in `public/data/establishments/`.
- **Browser:** the shared Location Labels check tracks the new layer as it does `establishments-extra`, which E3b set up. Network 0.

## Order

1. **E3c-a:** the build (`scripts/overture/`, duckdb in Actions from pip, never in `package.json`) and its checks, with no data. The `landmarks.yml` change is a `.github` change, so it merges alone.
2. **E3c-b:** the first data, as a PR from that workflow, opened by hand if Actions still can't open PRs (as #1148).
3. **E3c-c:** the layer. Lazy, with 0 B proven as above.

## Questions for the owner

1. **In the repo, or R2?** Recommended: the repo (no steps for you, about 17 MB a year of history). R2 means the steps above and a PMTiles reader.
2. **The kinds.** Food, cafés, clinics, schools, as answered. Clinics include dental clinics, 5,734 of the 9,622. Keep them?
3. **Told apart?** Should Overture's markers look different from OSM's, for example lighter or smaller, since they're less reliable (the study: 15 of 20 plausible against OSM's 20 of 20)? Recommended: the same look, with the dedup and the road-line filter doing the work.
4. **The credit.** "© Overture Maps Foundation" in the map's corner while the layer shows, at no opening cost. Is that enough, or should the contributor page's Map Data Source sheet list it too (a few bytes of opening code)?

## The owner's answers (2026-11-23, through the hub)

All the recommended picks:

1. The files go **in the repo**, `public/data/overture/v1/`, refreshed monthly like E3a, so the owner has no steps.
2. **Dental clinics stay.**
3. **The same markers** as OSM's.
4. **The credit in the map's corner only**, so the opening code grows by 0 B.

The trial build on 2026-11-23 used this release with Metro Manila's roads only; Actions uses the whole panning box's. It wrote 34,365 places in 355 cells, 2.8 MB together; the densest cell held 2,140 places in 171 kB. Dropped: 1,260 for address-like names, 7,732 on a road's centre line, 5,963 that OSM already has.
