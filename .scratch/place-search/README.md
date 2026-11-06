# Place search

Status: building. The owner said yes to this plan on 2026-11-06, with every recommended answer.

A commuter types a place and the map takes them there. Two steps: first Para's own places (feature bank F34), then OpenStreetMap landmarks for what Para has no hotspot for (a safe slice of F33: no geocoder at runtime). Words as in `CONTEXT.md`: a **place** is every hotspot sharing one informal name; a **landmark** here is a named OpenStreetMap point that may or may not be near a place.

## Step 1: search Para's own places

- **What is searched.** Every place in the published index (`/data/index.v5.json`, `stops`): its informal name (or its name, when it has none), and each hotspot's name and aliases. About 139 hotspots today. No new file and no new fetch: the public map already holds the index.
- **Matching** (decision 4). Name, informal name and aliases; ignoring case, accents and small typos. Pure functions in `src/features/routes/model/`, with unit checks.
- **Ranking** (decision 4). By match quality first (whole name, then start of a word, then inside a word, then a typo match), then by straight-line distance from the commuter when location is on, then by name.
- **Where** (decision 2). On a phone, at the top of the map. On a computer, at the top of the docked route list.
- **Choosing a result** (decision 3). The camera moves to the place and its route list opens, exactly as tapping the place on the map does today. Same code path, not a copy.
- **Not found.** "No place called '…' yet".
- **Commuter map only** (decision 5). The studio has no search.
- **Built** (ticket 02). `src/features/routes/model/place-search.ts` (the fold, the match, the ranking; `tests/unit/place-search-test.mjs`), `src/features/routes/search/` (the field and its results, a combobox: arrows, Enter, Escape) and `src/app/public-map/place-search-bar.tsx` (where it sits). At one match quality, a place matched by its own label comes before one matched by another name: "fairveiw" finds SM Fairview before Robinson, whose alias is "SM Fairview". The commuter's position is read as they type, never during render, since the page keeps it in a ref.
- **For now, until the owner designs it:** on a phone the bar hides while a card is open. On a computer it stays, and the floating cards (`corner` and `dock`) start under it: BottomSheet reads `--sheet-float-top`, 0 unless set, and the public map sets it as one static class (the hub's yes to question 5). It steps down under "Update Para!" and, on a wide map, under the offline pill.

## Step 2: OpenStreetMap landmarks

- **The file** (decisions 6, 7, 10). `public/data/landmarks.v1.json`, built by `scripts/landmarks/build.sh` from OpenStreetMap: malls, schools, universities and colleges, hospitals, churches, markets, transport stations (rail, bus terminals, ferry), barangays and major streets (trunk, primary, secondary) inside the map's panning box. No shops or houses. One point each: an area's centroid, a street's stretch at the vertex nearest its middle. 6,880 landmarks, 757 kB (166 kB gzipped) from the 2026-11-05 extract; the ceiling is 3 MB and `tests/unit/landmark-file-test.mjs` holds it.
- **Loading** (decision 7). Fetched on the first search only, never part of the public page's shared chunk, and kept by the offline worker once fetched.
- **Routes near here** (decision 8). A landmark that is not a Para place shows the hintuans within about 500 m, **straight-line** (not walking distance; the sheet says so), nearest first, each with its routes. None: "No Para routes near here yet".
- **Results order** (decision 9). Para places first, with their mode icon; then landmarks, marked as landmarks.
- **Credit** (decision 10). "© OpenStreetMap contributors" beside the results whenever a landmark is listed.
- **Rebuilding** (decision 11). Monthly or on demand, as a normal pull request. The script downloads one extract at build time; visitors never reach OpenStreetMap.

### The data and its licence

The landmark file is derived from OpenStreetMap and is available under the **Open Database License (ODbL 1.0)**, © OpenStreetMap contributors. JSON has no comments, so the file's first fields are its header: `license` (`ODbL-1.0`), `attribution`, `license_note`, `source` and `extract_at`. Keep the credit with any copy, and wherever the app shows a landmark.

The source is openstreetmap.fr's daily Metro Manila extract (`https://download.openstreetmap.fr/extracts/asia/philippines/metro_manila.osm.pbf`, about 60 MB, checked against its MD5): Geofabrik's smallest file is the whole Philippines, and the public Overpass servers are not reachable from the build sessions. `osmium-tool` (apt, not npm) filters the tags; `scripts/landmarks/landmarks.mjs` makes the points.

Known limits of the file:

- A street is one point per stretch. EDSA is one point near Cubao, so "routes near here" for a street only looks around that point (question 4 to the owner).
- OpenStreetMap's tags are what volunteers wrote: a "market" can be a food shop, a school can be listed under two names. The monthly rebuild picks up fixes made on OpenStreetMap; Para never edits the file by hand.
- Places of worship are Christian churches only, as the owner listed (question 1).

## Owner to design later

Designed for now from existing primitives and tokens, never final. Each needs the owner's Figma:

1. The search field: its look, placement on a phone over the map, and inside the docked route list on a computer.
2. A result row: name, informal name or the alias that matched, the mode icon, the landmark mark, distance.
3. Highlighting the matched letters in a result.
4. The empty state "No place called '…' yet": type, spacing, any illustration.
5. Loading the landmark file: what shows while it arrives on the first search.
6. The error state when the landmark file cannot load (offline before it was kept).
7. The "© OpenStreetMap contributors" credit: where it sits beside the results.
8. The "routes near here" view: header, the straight-line note, each hintuan with its routes, and "No Para routes near here yet".
9. Long names in rows and in the field: truncate or wrap.
10. The camera move to a landmark that is not a place: zoom level, and whether a marker shows.
11. The bar's card behind the field (white, rounded, the large shadow) and its visible "Search places" label: built so the label reads over the map.
12. Search while a card is open: on a phone, hidden for now; on a computer, the bar stays and the cards float under it (question 5, built). How the two look together has no story yet: the owner's call whether one is wanted.
13. A search icon in the field: none exists in the design system, so none is drawn.
14. The studio's search bar (ticket 05): its place on the three studio maps, and the temporary marker a landmark pick leaves.

## Tickets

| # | Ticket | Status |
| --- | --- | --- |
| 01 | [The landmark file](issues/01-landmark-file.md) | resolved (#811) |
| 02 | [Search Para's own places](issues/02-search-own-places.md) | resolved (#817) |
| 03 | [Landmarks and routes near here](issues/03-landmarks-in-search.md) | building |
| 04 | [The monthly rebuild](issues/04-monthly-rebuild.md) | in review (#826) |
| 05 | [Studio place search](issues/05-studio-place-search.md) | blocked by 03 |

## Questions sent to the hub (2026-11-06)

1. Places of worship: churches only, as listed, or also mosques and temples (the Golden Mosque in Quiapo is a landmark people name)? Recommended: all places of worship, in one kind. Built: churches only.
2. The monthly rebuild opens its pull request with the workflow's own token. GitHub then starts no CI on it by itself, and the repository must allow Actions to create pull requests (Settings → Actions → General). Recommended: the owner ticks that setting; the workflow opens the pull request and then starts CI on its branch with "Run workflow" (allowed for the token). `osmium-tool` comes from apt on the runner, like Planetiler's jar in the tiles build.
3. The source is openstreetmap.fr's Metro Manila extract rather than Geofabrik's or Overpass. Recommended: keep it (smallest download; reachable from both the sessions and GitHub).
4. A long street is one point. Recommended: store a point every 1 km along a major street (still well under 3 MB) so "routes near here" works along all of EDSA, and search lists the street once, opening at the point nearest the commuter.
5. (Sent after route card step 7 merged.) On a computer, may the corner sheet start below the search bar? Recommended: one opt-in line in `bottom-sheet.tsx`, the corner kind reading its top from a CSS variable only the public map sets. Answered yes by the hub, for `corner` and `dock`.

## Answers (the owner, 2026-11-06, via the hub: all recommended)

1. Places of worship of all faiths, as one landmark kind.
2. The owner ticks GitHub's "Allow Actions to create and approve pull requests" themselves; ticket 04 waits for the hub's confirmation.
3. Keep openstreetmap.fr's Metro Manila extract.
4. A point every 1 km along major streets.
5. Yes, for `corner` and `dock`: built in #817.
6. Yes: `search/` added to `.claude/CLAUDE.md`'s routes block in #817.
