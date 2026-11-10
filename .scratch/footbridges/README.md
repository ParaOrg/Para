# Footbridges

Status: plan only, no code. The owner approved the direction (Q56 a, b and c; Q57; Q58). The questions below go to the owner through the hub before any ticket starts.

A commuter in Metro Manila often has to cross a road on foot before or after a ride. Footbridges are how they do it on the big roads, and today Para shows none. Three parts:

- **(a)** a footbridge layer on the commuter map;
- **(b)** walking directions that use footbridges;
- **(c)** a reference layer in the studio.

Words as in `CONTEXT.md`. Here a **footbridge** is an OpenStreetMap footway on a bridge (`highway=footway` + `bridge=yes`); its **access points** are the elevators and steps that lead up to it.

## The data: what OpenStreetMap has

Counted from the same Metro Manila extract the landmark file is built from (openstreetmap.fr, extract of 2026-11-05), inside the owner's box, 120.93–121.12 E, 14.39–14.78 N:

| What | Count |
| --- | --- |
| Footways on a bridge (`highway=footway` + `bridge`) | 1,171 ways, 39.6 km, 130 named, 177 covered |
| …of which cross a road or rail line | 509 ways |
| Roads they cross | primary 210, trunk 78, secondary 68, tertiary 47, light rail 27, motorway 18, subway 19, links 42 |
| Other walkways on bridges | steps 354, paths 141, pedestrian 20 |
| Elevators (`highway=elevator`) | 121 in the box, 37 within 30 m of a footbridge |
| Crossings (`highway=crossing`) | 10,144 in the box, 409 within 30 m of a footbridge (mostly the crosswalk under or beside it) |
| Steps as nodes (`highway=steps`) | 17 in the box, 7 within 30 m of a footbridge |

**Against the owner's own exports** (874 lines, all footway + bridge, 83 named; 99 points: 10 elevators, 4 steps, 15 crossings, 70 untyped). I don't have those files, so these are counts only:

- **Lines.** The extract has 1,171 against the owner's 874, and 130 named against 83. Three likely reasons, none checked: the owner's export is older or from another source; it was clipped tighter; or OpenStreetMap splits one footbridge into several ways (deck, ramps, stairs landings), so the counts are ways, not bridges. More than half of the extract's ways cross no road or rail: they are bridges over creeks, in parks and in villages.
- **Points.** The owner's 99 look like points on the footbridges themselves. The extract has 37 elevators, 7 steps nodes and 409 crossings within 30 m of one. The crossings are mostly the at-grade crosswalk under the bridge, so they are not the owner's 15.
- **One question** (Q7) is whether to use the owner's files as a one-time cross-check only.

## The file and the budget

- **One file, built monthly with the landmarks.** `public/data/footbridges.v1.json`, built by the same monthly workflow as `landmarks.v1.json` (`scripts/landmarks/build.sh` and `landmarks.yml` today), from the same download, in the same pull request. ODbL, with the same header fields (`license`, `attribution`, `source`, `extract_at`).
- **What it holds.** Each footbridge: its line (6 decimals), its name if it has one, whether it is covered, and its access points (elevators, steps) with their points.
- **Size.**
  - All 1,171 footway bridges: 77 kB, 21 kB gzipped, lines only.
  - Only those over a road or rail (Q1's recommendation): about half that, plus the access points, about 40 kB, 12 kB gzipped.
  - The ceiling to hold it to in a unit check: 500 kB.
- **Never in the shared chunk.**
  - The file is fetched when the layer first draws, not with the page, the way the landmarks are fetched on the first search.
  - The layer's code is its own chunk, kept out of `shared` the way place search is (`vite.config.ts`'s exclusion list), and `health.mjs` is measured before and after.
  - The public page's opening code (407 of 413 kB today) must not grow by more than a few lines of wiring.
- **Offline.** The offline worker keeps the file once it has been fetched (stale-while-revalidate, as `landmarks` is: `scripts/node/offline-worker-caches.ts`). Offline before the first fetch: no footbridges, and no error shown, since the map works without them.

## (a) The commuter map layer

- Footbridges drawn as lines over the basemap, from a zoom where they mean something (Q2 recommends street level, about zoom 15), under the routes and hotspots.
- Elevators marked where the data has them (Q3). Steps are not marked at first.
- No tap target at first (Q4). Anything shown only on the map must also be available as text, so the text comes from (b)'s walk line.
- **The look is the owner's to design.** It is built for now from existing tokens and listed under "Owner to design later" below.

## (b) Walking directions that use footbridges

**Today.** Para has no walk routing. The only walking it says is ticket 07's line on the trip card: "About 300 m to SM North EDSA, in a straight line". A straight line can cross EDSA, which no one should do on foot.

**What real walk routing would take.**
- **A walking graph** for Metro Manila: footways, paths, steps, residential and service streets, and the big roads' sidewalks where they are mapped. From the same extract that is about 164,000 ways and 550,000 nodes, a 13 MB PBF before any trimming.
- **A router that finds a path through it.** Either in the browser over a graph it downloads, or on a server.
- **Para has no server for this** (ADR 0001: commuters read only the published map), and the public routing services have the same problem as the public geocoders the brief rules out at runtime (Q6).
- **The data's limits.** The graph is only as good as OpenStreetMap's sidewalks and crossings in Metro Manila, which are patchy, and the app would be telling people where it is safe to cross.

### Design it twice

**Design 1: a footbridge hint, no routing.**
- **When it shows.** The walk from a ride's end to where the commuter is going (ticket 07's landmark, later any place) crosses a major road (trunk, primary or secondary) in a straight line.
- **What it says.** It names the nearest footbridge over that road within about 300 m of the crossing point: "Cross Commonwealth Ave by the footbridge 120 m north (elevator)". When there is none: "Crosses Commonwealth Ave: no footbridge mapped nearby".
- **What it needs.** The footbridge file, plus the major roads as lines to test the crossing against. About 1 MB raw for Metro Manila, smaller simplified and only near hintuans; to measure in ticket 04.
- **Size and cost.** A pure function and a line of text. No graph, no router, no new server.
- **What it can't do.** It can't say how to reach the footbridge or the turns after it. The walk stays "in a straight line", now with the one fact that matters most on a big road.

**Design 2: a walking graph in the browser.**
- **The graph.** Built monthly from the extract, trimmed to the walkable network within about 1 km of a hintuan, cut into tiles about 2 km square, each fetched when a walk needs it.
- **Routing and output.** A shortest path in a web worker, footbridges and crossings weighted so the path takes a footbridge over a big road. The walk drawn on the map, and turn-by-turn words.
- **Size.** Several MB for all of Metro Manila even trimmed. Tens to hundreds of kB per walk, fetched on demand, kept offline per tile.
- **Cost.**
  - A build step and a routing module (Para's first), with unit checks on real junctions.
  - A worker.
  - The owner's design for a walk on the map.
  - An honest answer when OpenStreetMap's sidewalks are missing.
  - Weeks, not days.
- **What it can do.** A real path, and the start of walking to and from any hintuan.

**Recommendation.** Build Design 1 now (ticket 04): it answers the dangerous case, crossing a big road, with the data the layer already brings. Keep Design 2 as a research ticket (05). It starts only if the owner wants turn-by-turn walking, after Design 1 has run and the graph's size has been measured on real tiles.

## (c) The studio reference layer

- **Where.** The footbridges and their access points on the studio's maps (the workshop and the Contributors map), so an editor drawing a route or placing a hintuan sees where people cross.
- **What it shows.** The same file the public map reads, so the studio shows exactly what commuters see. Read-only: it marks nothing and saves nothing.
- **How it's switched.** A toggle with the studio's other map layers, off by default (Q9).

## Tickets

| # | Ticket | Status |
| --- | --- | --- |
| 01 | [The footbridge file](issues/01-footbridge-file.md) | needs-triage: waits for the owner's answers |
| 02 | [Footbridges on the commuter map](issues/02-commuter-layer.md) | needs-triage; after 01 |
| 03 | [Footbridges in the studio](issues/03-studio-layer.md) | needs-triage; after 01 |
| 04 | [A footbridge hint on the walk (design 1)](issues/04-walk-hint.md) | needs-triage; after 01 |
| 05 | [Walking routing in the browser (design 2): research](issues/05-walk-routing-research.md) | needs-triage; only if the owner asks for turn-by-turn |

## Questions for the owner (each with a recommendation)

1. **Which bridges?** Every footway on a bridge (1,171, creek and park bridges among them), or only those that cross a road or rail line (509 ways)? Recommended: only those over a road or rail, the ones a commuter means by "footbridge".
2. **From which zoom on the commuter map?** Recommended: street level, about zoom 15 and in, under the routes. No toggle at first.
3. **Elevators and steps?** Recommended: mark elevators (the access that matters most to a senior, a parent with a stroller or a wheelchair user). Don't mark steps at first, since most footbridges have them.
4. **A tap on a footbridge?** Recommended: nothing at first. Its name and elevator reach the commuter as text in the walk hint (ticket 04), so the layer stays decoration plus that text.
5. **Walking (b): Design 1 now, Design 2 later?** Recommended: yes. The hint now (ticket 04); the browser walking graph only as research (ticket 05), and only if the owner wants turn-by-turn.
6. **Public routing services at runtime (OSRM's foot profile, GraphHopper, Valhalla's public servers)?** Recommended: off the table, as the public geocoders are. Para keeps no server, and commuters' walks shouldn't depend on a free service's goodwill.
7. **The owner's exports (Footbridge-lines.geojson, Footbridge-nodes.geojson)?** Recommended: a one-time cross-check, not committed and not a source. The monthly OpenStreetMap build is the source, so the layer improves as volunteers map. If the owner wants the comparison by feature, not just counts, the hub attaches the files to the session for ticket 01.
8. **The same monthly build and pull request as the landmarks?** Recommended: yes. One download, one pull request with both files, the footbridge count in its comparison table.
9. **The studio's layer: on or off by default?** Recommended: off, with a toggle beside the studio's other map layers. Editors turn it on when they place a hintuan near a crossing.

## Owner to design later

Built for now from existing tokens, never final. Each needs the owner's Figma:

1. The footbridge line on the commuter map: colour, width, casing, dash, and how it sits against routes, hotspots and the basemap's own bridges.
2. Covered footbridges: marked differently or not.
3. The elevator mark (and steps, if ever).
4. The zoom where footbridges appear, and whether they fade in.
5. The walk hint's words and place on the trip card (ticket 04), next to ticket 07's walk line.
6. The studio's reference look and its toggle.
7. Design 2, if built: a walk drawn on the map, and its turn-by-turn list.
