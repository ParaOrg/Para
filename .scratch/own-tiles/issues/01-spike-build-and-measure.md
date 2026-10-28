# 01: Spike: build Metro Manila tiles and measure them

Status: resolved
Type: prototype
Who: Sonnet

## The question

Can we build our own OpenMapTiles-schema vector tiles for the area ParaPo's routes reach, and do OpenFreeMap's three styles (Positron, Liberty, Fiord, as `basemap.ts` dresses them) draw them the same? How big is the file, and how big are the tiles a commuter downloads?

## What to do

1. **The area.** The box around every route in the published map (`/data/index.v5.json` and its line files, or `public/data/` in the repo) plus a margin of about 5 km. Write the box down.
2. **The build.** Planetiler's OpenMapTiles profile, from Geofabrik's Philippines extract, clipped to the box, zoom 0–14, output PMTiles. Planetiler is a build tool (a Java jar), not an app dependency: do not add anything to `package.json`. If this container cannot reach Geofabrik or Maven, run the build in a GitHub Actions job instead (a `workflow_dispatch` or path-filtered job on this ticket's PR, uploading the file as an artifact) and say which you used.
3. **Measure:**
   - the PMTiles file's size;
   - the tile count per zoom, and the median and largest tile at z12–14, gzipped;
   - the same for OpenFreeMap's tiles over the same few spots (SM Fairview, Quiapo, BGC), if reachable;
   - the build's time and peak memory.
4. **Draw it.** Serve the file locally as `{z}/{x}/{y}` (a small Node script reading the PMTiles file is fine, in `scripts/research/`) and render the three designs at the same three spots at z12, z14 and z16, beside OpenFreeMap's where reachable. Note anything missing: labels, icons, roads, water.
5. **What the styles still fetch from OpenFreeMap:** list every sprite, glyph and raster (`natural_earth`) URL, and the licence of each.

## Out of scope

No change to `src/`, `vite.config.ts` or the live site. No R2 or Worker yet (02, 03).

## Files it owns

`scripts/research/tiles-*.mjs`, an optional workflow file for the build, and this ticket's `## Answer`.

## Output

Under `## Answer`: the box, the numbers above, screenshots (committed under `.scratch/own-tiles/spike/` if small, otherwise attached to the PR), what differs from OpenFreeMap, and a recommendation for 02 and 03 (area, zooms, file size, monthly build time). Then set `Status: resolved`.

## Answer

**Yes.** Planetiler's OpenMapTiles profile builds the tiles in about four minutes, and Positron, Liberty and Fiord (as `basemap.ts` dresses them) draw them the same as OpenFreeMap's. Nothing was missing in what I looked at. Recommendation: build the whole area the public map can be panned across, for about 66 MB.

How it was run: in GitHub Actions, because this container cannot reach Geofabrik and the sandbox would not run the downloaded jar. The job is `.github/workflows/tiles-spike.yml` (draft PR #413), run [40451245217](https://github.com/ParaOrg/Para/actions/runs/40451245217) on `ubuntu-latest`. Its step summary carries every table below. Artifacts, kept 14 days: `tiles-spike-screenshots` (54 renders, 9 side-by-side sheets, `summary.json`, the Planetiler logs) and `tiles-spike-pmtiles` (the 33 MB file). Planetiler 0.10.2, pinned and checked against its SHA-256; Geofabrik's `philippines-latest` of 2026-10-26, checked against its md5.

### The box

Every published route (the 108 hotspots and the overviews in `index.v5.json` and the 26 line files, 7,202 positions) spans 120.9775,14.4852 to 121.1761,14.7769. Plus 5 km: **`120.9311,14.4403,121.2225,14.8218`** (west, south, east, north), about 31 × 42 km. `node scripts/research/tiles-bbox.mjs [marginKm]` recomputes it.

The public map is not locked to that box: `METRO_MANILA` in `map-view.tsx` lets a commuter pan across `120.6,14.1,121.5,15.05`, about seven times the area. Outside our tiles the map would draw nothing, so I built that box too (below).

### The numbers

| | Routes + 5 km | Whole panning box |
| --- | ---: | ---: |
| File | **32.85 MB**, 399 tiles | **65.82 MB**, 2,568 tiles |
| z14 share of the file | 25.4 MB (77%) | 48.4 MB (73%) |
| Build, wall clock | 3.5–4 min (210 s and 237 s on two runs) | 237 s |
| Peak memory | 4.4 GB | 4.5 GB |

Of the job's 11 minutes, the extract download takes about 50 s and Planetiler's own downloads (water polygons, Natural Earth, lake centerlines) 46 s.

Tiles per zoom, gzipped, routes + 5 km:

| z | tiles | total | median | p95 | largest |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0–6 | 1 each | 5–22 kB | | | |
| 7 | 2 | 68.9 kB | | | |
| 8 | 2 | 101.4 kB | | | |
| 9 | 4 | 303.5 kB | | | |
| 10 | 4 | 274.4 kB | | | |
| 11 | 9 | 390.8 kB | | | |
| 12 | 25 | 1.46 MB | 52.3 kB | 135.5 kB | 152.6 kB |
| 13 | 80 | 3.97 MB | 39.4 kB | 133.5 kB | 139.4 kB |
| 14 | 266 | 25.4 MB | 65.4 kB | 277.6 kB | 340.5 kB |

The whole panning box has 132, 483 and 1,890 tiles at z12, z13 and z14, with medians of 19.7, 9.2 and 5.2 kB (the outer area is mostly water and hills) and the same largest tiles (the busiest tiles are all in the first box).

OpenFreeMap's tiles over the same spots (planet build `20261025_080012_pt`; gzipped, as the wire carries them):

| spot | tile | OpenFreeMap | ours |
| --- | --- | ---: | ---: |
| SM Fairview | 12/3425/1878 | 91.8 kB | 89.0 kB |
| SM Fairview | 13/6850/3756 | 72.3 kB | 71.8 kB |
| SM Fairview | 14/13701/7513 | 155.3 kB | 154.8 kB |
| Quiapo | 12/3424/1880 | 129.2 kB | 121.4 kB |
| Quiapo | 13/6849/3760 | 138.6 kB | 134.3 kB |
| Quiapo | 14/13698/7520 | 300.6 kB | 290.0 kB |
| BGC | 12/3425/1880 | 160.8 kB | 152.6 kB |
| BGC | 13/6850/3761 | 124.4 kB | 120.9 kB |
| BGC | 14/13700/7522 | 234.3 kB | 227.6 kB |

Ours are 0.3–6% smaller. The heaviest tiles a commuter meets (Quiapo, BGC at z14) are about 230–340 kB gzipped either way.

### Drawn

Monochrome, Colour and Fiord at SM Fairview, Quiapo and BGC at z12, z14 and z16, once over OpenFreeMap's tiles and once over ours (the page runs the app's own `initialStyle`, so the dressing in `monochrome.ts` and `daylight.ts` is applied; the sprite and glyphs come from OpenFreeMap in both). 54 renders, no map errors. In the 27 pairs, at most **0.5%** of pixels differ by a visible amount (mean 0.09%). I looked at three sheets (Monochrome at Quiapo, Colour at BGC, Fiord at SM Fairview): the same roads, water, buildings (3D at z16), labels, shields, station and shop icons. I did not inspect what the few differing pixels are; the likely cause is that our extract is a day newer than OpenFreeMap's planet build, plus label collision.

What differs from OpenFreeMap:
- **Data age.** Ours is whatever Geofabrik had on build day.
- **Languages.** Planetiler's default keeps every `name:*`. OpenFreeMap's tiles are about as large, so it looks like the same choice; the styles only read `name`.
- **Outside the box** nothing is drawn, and at z0–z8 only the box's own features exist. The commuter map cannot be panned there, so this matters only if the pan limit grows.

### What the styles still fetch from OpenFreeMap

From the renders' requests; all at `tiles.openfreemap.org`:

| What | URL | Licence |
| --- | --- | --- |
| Styles | `/styles/{positron,liberty,fiord}` | Positron: code BSD-3-Clause, design CC BY 4.0, derived from CartoDB Basemaps (CC BY 3.0). Liberty (a fork of OSM Bright): code BSD-3-Clause, design CC BY 4.0. Fiord: forked from `openmaptiles/fiord-color-gl-style` per OpenFreeMap's README, not listed in its `LICENSE.md`; check that repo's licence in 02. |
| Sprite | `/sprites/ofm_f384/ofm.json` and `.png` (49 kB; `@2x` 119 kB) | Maki icons CC0 1.0; right arrow public domain; built with spritezero-cli (ISC) |
| Glyphs | `/fonts/{fontstack}/{range}.pbf`: Noto Sans Regular, Bold and Italic (Fiord: Regular only) | SIL Open Font License 1.1 |
| Raster | `/natural_earth/ne2sr/{z}/{x}/{y}.png`, source `ne2_shaded` (maxzoom 6) | Natural Earth, public domain |
| Tile JSON | `/planet` | the tiles go away with the switch |

Raster: only Liberty draws it (layer `natural_earth`, to z7). The 54 renders at z12 and above never requested one.

Licences are from OpenFreeMap's `LICENSE.md` (github.com/hyperknot/openfreemap). Keep "© OpenMapTiles" and "© OpenStreetMap contributors" in the attribution: OpenMapTiles' design is CC BY 4.0 and the data is ODbL.

### Recommendation for 02 and 03

- **Area.** Build the whole panning box, `120.6,14.1,121.5,15.05`: 66 MB, 2,568 tiles. It costs about twice the routes-only box and removes any blank edge. If the owner would rather keep the file small, the routes-only box (33 MB) needs `maxBounds` tightened to it, a change in `src/` that belongs in 04. Either way, derive the box in the build from the published index plus a margin, not from a constant, and fail the build if a route falls outside it.
- **Zooms.** 0–14, as OpenFreeMap. MapLibre stretches z14 to z16 and beyond; the z16 renders above look right. Nothing is gained by stopping lower: z14 is 73–77% of the file, but those tiles are the ones a commuter reads.
- **Size.** 66 MB is above the 25 MiB cap on a Cloudflare static asset, so R2 and a Worker are right, as the spec says. A 340 kB largest tile is within what OpenFreeMap serves today.
- **Monthly build.** About 4 minutes of Planetiler with 4.5 GB resident, about 6–7 minutes for the whole job; the repo is public, so the minutes are free. 02 should pin Planetiler and check its SHA-256 as this job does, check the extract's md5, and fail loudly if the file is under a size floor (say 20 MB) or has fewer tiles than the last one.
- **Cache Planetiler's own downloads** (`data/sources`: water polygons from osmdata.openstreetmap.de, Natural Earth from naturalearth.s3.amazonaws.com, lake centerlines from dev.maptiler.download). They are fetched from three third-party hosts on every build; one outage would fail the build. `actions/cache` or a copy in R2 closes that.
- **Extract.** The job used Geofabrik's `philippines-latest`. Geofabrik is blocked from the owner's agent containers but not from Actions; the build runs only in Actions, so this is fine.
- **03.** The Worker serves `{z}/{x}/{y}`: `tiles-serve.mjs` is a short model of it (header, directory walk, gzip passthrough: `Content-Encoding: gzip`, `204` for an empty tile). Serve 204, not 404, for a tile the file does not hold, as MapLibre treats it as empty.
- **Also host** the sprite (`json`, `png` and `@2x`), the three Noto Sans fonts' glyph ranges, and copies of the three styles pointing at our tiles, sprite and glyphs. Without them ParaPo still depends on OpenFreeMap whenever the map loads. The `natural_earth` raster only matters to Liberty at z7 and below, which the panning box never shows; drop that layer in our copy.

## Comments
