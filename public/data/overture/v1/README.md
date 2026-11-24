# Overture places

The places the map draws beside OpenStreetMap's: eateries, cafés, clinics and schools from
[Overture Maps Places](https://docs.overturemaps.org/guides/places/), the release named in
`index.json`. Built monthly by `scripts/landmarks/build.sh` (`scripts/overture/`); never edited by
hand. Not OpenStreetMap data, and never merged into `../../establishments/`.

## Licences

Each place comes from one or more of Overture's sources, under that source's licence
([Overture's attribution page](https://docs.overturemaps.org/attribution/)):

| Source | Licence | Text here |
| --- | --- | --- |
| Meta, Microsoft and Overture's own | Community Data License Agreement – Permissive 2.0 | `LICENSE-CDLA-Permissive-2.0.txt` |
| Foursquare | Apache License 2.0, © 2024 Foursquare Labs, Inc., with its notice | `LICENSE-Apache-2.0.txt`, `NOTICE` |
| AllThePlaces | CC0 1.0 | `LICENSE-CC0-1.0.txt` |

Credit: © Overture Maps Foundation. The map shows it in its corner while these places are drawn.

## What Para changed

Only places inside the map's area with Overture's confidence of at least 0.7 and in a few
categories are kept. Places whose name reads like an address, whose point lies on a road's centre
line, or which OpenStreetMap already has are dropped. Each place keeps a short id (`o` and the
first 16 hex digits of its Overture id), its kind, its point rounded to 5 decimals, its name and
its brand. The files are cut by area: `index.json` lists the cells, each `<col>-<row>.json` holds
the places in one 0.05° square.
