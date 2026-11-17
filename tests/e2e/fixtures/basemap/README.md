# The basemap's stand-in

What `tests/e2e/lib/stand-ins.mjs` answers for `tiles.openfreemap.org` on a run without
`PARA_LIVE_SERVICES` (a pull request's CI run, and a local run by default). Every file here is
taken from a public source repository or made by Para; nothing is fetched from openfreemap.org,
whose terms of service ask that its service not be collected from automatically.

| Here | From | At | Licence |
| --- | --- | --- | --- |
| `positron.json`, `liberty.json`, `fiord.json` | [hyperknot/openfreemap-styles](https://github.com/hyperknot/openfreemap-styles), `styles/<name>/style.json` | commit `006ea5796803ba2df4330888836cb0a8f17473b4` (2026-10-25), taken 2026-11-16 | each style's own, below |
| `sprites/ofm_f384/ofm{,@2x}.{json,png}` | the same repository, `sprites/sprites/ofm_f384/` | the same commit | Maki icons CC0 1.0; the right arrow public domain; built with spritezero-cli (ISC) |
| `fonts/Noto Sans Bold/0-255.pbf` | [maplibre/demotiles](https://github.com/maplibre/demotiles), `font/Noto Sans Bold/` (where OpenFreeMap's fonts come from) | commit `601ae60796ceceda2cbd2ed3d2ea92d17a84be4b` (2026-08-21), taken 2026-11-16 | Noto Sans: SIL Open Font License 1.1 (`fonts/Noto Sans Bold/LICENSE.md`); the repository: BSD 3-Clause (`fonts/demotiles.LICENSE`) |
| `stand-in.pbf` | made by Para: `scripts/research/make-stand-in-tile.mjs` | — | Para's own |

The styles are copied as they are; the stand-in puts `tiles.openfreemap.org` in place of their
`__TILEJSON_DOMAIN__` as it serves them. Only the glyph ranges the suites ask for are kept: a
request for any other fails the suite, naming the range, and the range is then copied in from
the same demotiles commit.

`stand-in.pbf` is the one tile served for every z/x/y: a `water` polygon over the whole tile
(class `ocean`) and a `transportation` line across it (class `primary`), so the map draws a fill
and a line as it does live, and MapLibre compiles those programs at load. Shaded relief
(`natural_earth`) is answered with one transparent pixel.

## Credits and licences

- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (none of it is
  in these files: the tile is made up).
- **Positron**: designed by Stamen and Paul Norman for CartoDB Inc., licensed under CC BY 3.0;
  © KlokanTech.com & OpenMapTiles contributors. Code under the BSD 3-Clause License, design under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Notice in full: `positron.LICENSE.md`.
- **Liberty**: [OSM Liberty](https://github.com/maputnik/osm-liberty), a fork of OSM Bright,
  derived from Mapbox Open Styles. Code under the BSD 3-Clause License, design under CC BY 4.0.
  Notice in full: `liberty.LICENSE.md`.
- **Fiord**: [Fiord Color](https://github.com/openmaptiles/fiord-color-gl-style), based on Positron;
  © MapTiler.com & OpenMapTiles contributors, © CartoDB Inc. Code under the BSD 3-Clause License,
  design under CC BY 4.0. Maps derived from the OpenMapTiles schema credit
  [OpenMapTiles](https://openmaptiles.org/). Notice in full: `fiord.LICENSE.md`.
- **OpenFreeMap styles** (the repository): MIT, © 2023 Zsolt Ero, with its list of the projects
  it includes: `openfreemap-styles.LICENSE.md`.
- **Noto Sans**: SIL Open Font License 1.1, in full in `fonts/Noto Sans Bold/LICENSE.md`.

## Re-taking them

1. Clone the two repositories at a newer commit.
2. Copy `styles/{positron,liberty,fiord}/style.json` and `LICENSE.md`, and
   `sprites/sprites/ofm_f384/*`, from openfreemap-styles; the glyph ranges the suites ask for from
   demotiles' `font/`.
3. Update the commits and the date in the table above.
4. Run the suites without `PARA_LIVE_SERVICES`, then the staging push runs them live.

A stand-in gone stale shows as a live staging run failing where the pull request's run passed:
re-take the files first (tests/e2e/README.md).
