# Start from an old Para route

Status: ready-for-agent
Owner's decision: 2026-11-27 ("yes!"), option C, Para IDs `PARA-0001`…

## What and why

The old Para app's database (the owner's own, the app this one replaces) holds 1,737 community
routes: 1,445 jeepney, 278 bus, 14 UV Express, all in Metro Manila. 902 have a drawn line; 49 are
verified, the rest were pending review. The studio gets a second "start from" search beside
"Start from an OSM route", working the same way: search, pick, the line is drawn (or, with no
line, its start and end are placed) for the editor to check, draw and save.

## The source file

`scripts/old-para-routes/old-para-routes.v1.json`, extracted once by the hub from the owner's
backup of 2026-10-30 (tables `ph_routes` and `ph_route_shapes`). It holds route data only: no
people, accounts, locations, tracks, notes or ratings. The backup itself is never committed.
The old app is retired, so the file does not refresh; a new extract would replace it whole.

Each route: `paraId` (`PARA-0001`…`PARA-1737`, ordered by the old row's creation time, stable),
`oldId` (the old row's uuid), `name`, `mode` (`jeepney` | `bus` | `uv`), `isLoop`, `isOneway`,
`isBidirectional`, `isVerified`, `start` and `end` (`[lng, lat]` or null), `line` (GeoJSON
LineString or MultiLineString, or null) and `lengthM`.

Many names repeat (833 names appear more than once: both ways round, or resubmissions); the Para
ID tells them apart.

## What to build

- A build step, like `scripts/osm-routes/`, that turns the source into the studio's files under
  `public/data/old-para-routes/v1/` (an index for search with a coarse line, and a file per route
  with its full line), validated with Zod where the studio reads it. Only the studio reads them.
- In the studio, "Start from an old Para route" beside the OSM search: search by name (typos
  forgiven, as place search), by a place in the name, or by Para ID typed whole; at most 20
  results; each result shows mode, verified or not, and "no line" where there is none.
- Picking a route with a line draws it as the OSM start does; one without a line places its
  start and end (where known) and leaves the drawing to the editor.
- A PDF list (or a page in the studio) of every route with its Para ID, like the OSM list.

The look is a stand-in until the owner draws it (add it to `.scratch/studio-ux/owner-to-design-later.md`).
