# 01: Spike: build Metro Manila tiles and measure them

Status: ready-for-agent
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

## Comments
