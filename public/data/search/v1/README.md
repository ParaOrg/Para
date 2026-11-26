# The studio's search files

What the studio's place search looks through besides its hotspots and the landmarks: every
Overture store and eatery, drawn on the map or not, and every named OpenStreetMap establishment.
Built monthly by `scripts/landmarks/build.sh` (`scripts/search/`); never edited by hand. Only the
studio reads them, when its search opens: the public page never names them, and the public map's
offline copy does not keep them.

| File | From | Licence |
| --- | --- | --- |
| `overture.json` | [Overture Maps Places](https://docs.overturemaps.org/guides/places/), the release it names | Per source, below. © Overture Maps Foundation |
| `osm.json` | The OpenStreetMap establishments in `../../establishments/v1/` | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). © OpenStreetMap contributors |

The two are never merged: `osm.json` holds no Overture place, and `overture.json` no OpenStreetMap
one.

## Overture's licences

Each Overture place comes from one or more of Overture's sources, under that source's licence
([Overture's attribution page](https://docs.overturemaps.org/attribution/)):

| Source | Licence | Text here |
| --- | --- | --- |
| Meta, Microsoft and Overture's own | Community Data License Agreement – Permissive 2.0 | `LICENSE-CDLA-Permissive-2.0.txt` |
| Foursquare | Apache License 2.0, © 2024 Foursquare Labs, Inc., with its notice | `LICENSE-Apache-2.0.txt`, `NOTICE` |
| AllThePlaces | CC0 1.0 | `LICENSE-CC0-1.0.txt` |

## What Para changed

Only places inside the map's area are kept; from Overture, those with its confidence of at least
0.7, in a store category, a lodging one (hotels, inns, resorts) or one the map draws, open, and
whose name does not read like an address. Each place keeps its name, its category (Overture's
primary one, or the OpenStreetMap kind), and its point rounded to 5 decimals: `[name, category
index, lng, lat]`, the categories listed once at the top.
