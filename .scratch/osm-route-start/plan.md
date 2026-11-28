# Start from OSM route (studio)

The owner's OK, 2026-11-25. An editor starts a new line from an OpenStreetMap route relation instead of clicking it out from nothing. Studio only; the public map never reads any of it.

Status: built. PR 1 is [#1223](https://github.com/ParaOrg/Para/pull/1223), PR 2 is [#1225](https://github.com/ParaOrg/Para/pull/1225), and their CI and monthly refresh are [#1230](https://github.com/ParaOrg/Para/pull/1230).

Planned in two pull requests:

- **PR 1: data, nothing visible.** The files, their readers, the model, the guards and the unit checks.
- **PR 2: the UI.** Waits for the owner's answers on the entry point and the picker's look.

## 1. The editor's flow

1. In the workshop, signed in, a "Start from OSM route" entry sits beside the existing way to start a new line. Its place and look are the owner's call (questions below).
2. The editor picks a route one of two ways:
   - **Search** by ref ("T436", "101"), by name ("Philcoa", "Novaliches"), or by relation id ("r10183711", "10183711"). The results show each relation's name, ref, kind and direction (from → to).
   - **Tap near the map**: a tap lists the relations passing within about 140 m, nearest first.
3. Picking one shows a provenance card (§5), then **Start drawing**.
4. The line becomes an unsaved **draft** in the studio's normal drawing state, with the target "new route". This is the same state a freshly clicked line is in:
   - the kept draft (draft.ts, `para.draft.v1`) survives a reload;
   - the editor fixes the line, sets the ends and the hotspot boxes, and saves through the existing save → draft → approve path.
5. Nothing is published by the tool. It writes nothing to the database, and it never sets confidence or approval.

## 2. Seeding the drawing

The contributions path already does this, so the tool reuses it rather than adding drawing machinery. `contributors/actions/use-contribution-start.ts` calls `draw.startWithPoints(points)`: the points become control points, and the router answers each gap between them, with stand-ins drawn while it works. Uploads use it today, and the suites cover it.

- **The seed** (`seed-points.ts`) is control points thinned from the OSM line:
  - the line's ends;
  - every point where the line turns 25° or more;
  - a point at least every 400 m;
  - both ends of every gap.
- **The router re-snaps** the line to our streets, so the saved line is the router's. It stays consistent with lines drawn by hand.
- **Not done:** seeding OSM's geometry as finished segments (`begin({ points, segments })`). A "snapped" segment that no router made would skip the U-turn and streets checks every other line passes.

## 3. Gaps and loops

95 of the 451 jeepney relations have gaps.

- **The file** chains each route's member ways into stretches. It turns ways round where needed and does not trust member order. Each break between stretches is a recorded gap: the index of the point before it, and the metres across.
- **The seed** makes a gap's two ends control points. The router bridges them, so the draft has no hole.
- **The check spots** (`check-spots.ts`) are worked out each render from the drawing and the route, so nothing is stored:
  - every gap;
  - every stretch where the router's line is more than 30 m from OSM's for 100 m or more.
- **PR 2 draws them:** a numbered pin per spot, "3 places to check" in the panel, and arrows that jump between them.
- **A route that goes out and comes back,** or a loop (`turnaroundIndex`), splits at its farthest point. The editor takes each half as its own draft, one at a time. Once a loop's line is open, the existing loop-closing takes over.
- **A route with more than 3 gaps over 500 m** is still listed, marked "too broken to seed: trace by hand", with its OSM link (PR 2).

## 4. The data

The files are built monthly in `scripts/landmarks/build.sh` from the same extract as the terminals file (`scripts/osm-routes/`):

1. `osmium tags-filter r/route=bus,share_taxi,minibus,trolleybus,train,light_rail,subway,monorail` on the whole download, so a route's ways outside the box are there to chain.
2. `osmium cat -f opl`.
3. `osm-routes.mjs` classifies, chains, clips and writes the files.

**Kinds:**

- jeepney: `route=share_taxi`, `bus=share_taxi`, a "T" ref, or "jeep" or "PUJ" in its name or tags;
- UV: minibus, or "UV" or "FX";
- bus;
- rail: train, light_rail, subway or monorail. This includes LRT-1, LRT-2, MRT-3, PNR and the planned subway.

The EDSA Carousel is in the file as a bus. Ferries are left out.

**Files,** under `public/data/osm-routes/v1/`. Both have the same header as the terminals file: licence, "© OpenStreetMap contributors", the extract's source and time.

- `index.json`, one row per relation: [id, kind, ref, name, from, to, network, version, last edit, gaps, stops, coarse line].
  - The coarse line is the route's part inside the box, simplified to 100 m, for the tap test.
  - About 600 kB, 110 kB gzipped, 1,022 routes on 2026-11-23.
- `r<id>.json`, fetched only when an editor picks the route. It holds:
  - the line, simplified to 5 m and clipped to the box plus 0.02°, with `clipped` saying when it goes on outside;
  - the gaps;
  - the stops (stop members, or platforms where there are none): [role, lng, lat, name];
  - the relation's source, source:ref, note and fixme tags.
  - 1–13 kB each, about 3.7 MB in all.

**Studio only:**

- the studio reads the files in a lazy chunk;
- the public map's offline worker keeps none of them (a unit check);
- the commuter map and the contributor page never import `features/studio` (ESLint).
- PR 2 adds the check-build proof (no public or contribute chunk names `/data/osm-routes/`), with its positive control: the studio's chunk names it once the picker imports the reader.

**ODbL:** the credit sits on the picker and on the provenance card ("Route from OpenStreetMap, © OpenStreetMap contributors, ODbL"). A line saved from it is a derived database, which map.json's attribution already covers ("Derived from OpenStreetMap"). The owner to confirm.

**No API calls at edit time.** The tool reads the monthly files, and their age shows ("OSM data of 2026-11-23").

**The monthly refresh's workflow** (`.github/workflows/landmarks.yml`) must add `public/data/osm-routes` to the paths it commits, and the counts table (`osm-routes.mjs --compare`) to its PR body. That is a `.github` change, so it is its own PR, after PR 1.

## 5. Provenance in the studio

Shown on the card before **Start drawing**, then in the panel while drawing:

- the relation id, linked to `openstreetmap.org/relation/<id>/history`;
- its version and last edit date;
- its source tags verbatim: source, source:ref (e.g. "LTFRB Memorandum Circular 2022-067"), note, fixme;
- the number of gaps and of stops mapped, the network and the operator;
- "Clipped to the map's area" when it goes on outside;
- "Hand-mapped by OSM volunteers. Check it on the ground before approving."

Not in the file: the creating mapper and changeset. Geofabrik's extract strips them, and fetching them monthly would mean about 1,000 API calls. The history link covers it.

The routes study (2026-11-25) found:

- no relation derives from the DOTC GTFS;
- no 2014–2015 mass import;
- the relations are hand-traced, often from LTFRB memorandum circulars.

## 6. Who does what

- **PR 1, this session:**
  - `scripts/osm-routes/` and its `build.sh` step;
  - `public/data/osm-routes/v1/`;
  - `src/features/studio/osm-routes/`: the schema, `fetch-osm-routes.ts`, `search-osm-routes.ts`, `seed-points.ts`, `check-spots.ts`;
  - the unit checks.
  - Nothing in `features/studio/drawing` or the workshop.
- **PR 2, the detail session or this one as the hub assigns:**
  - the picker and its entry point;
  - `use-osm-route-start.ts` (calls `draw.startWithPoints`, as `use-contribution-start` does);
  - the check-here pins and count, and the provenance card;
  - stories;
  - the check-build proof;
  - the e2e suite.
- **PR 3, `.github` alone:** the monthly refresh commits the files.

## 7. Tests

**Unit, PR 1** (`osm-route-file-test`, `osm-route-start-test`):

- kinds;
- chaining ways out of order or reversed, with gaps;
- simplification;
- the clip to the box;
- a relation to its route, its gaps, stops and provenance;
- both files' shapes and checks;
- the committed files: every route has its file; LRT-1 has 25 stations, LRT-2 13, MRT-3 13; the Carousel is there;
- the files read through the studio's schema;
- the fetchers;
- search by id, ref and name;
- routes near a tap;
- the seed: ends, turns, 400 m spacing, both ends of a gap;
- the turnaround split;
- the check spots: a gap; a 60 m stray over 300 m; no spot for a 10 m wobble or a short blip;
- the public map's offline worker keeps none of the files.

**e2e, PR 2** (`studio-osm-start-test`, against the REST stand-in and a fixture route with one gap):

- pick by ref → a draft with its control points and "1 place to check";
- a reload keeps the draft;
- a save writes a draft row and publishes nothing;
- the public page never asks for `/data/osm-routes/`.

**Stories, PR 2:**

- the picker: loading, empty, error, results, "too broken";
- the provenance card;
- the check-here count.

## Open questions for the owner

1. Where the entry sits, and the picker's look: a panel or a sheet.
2. Should OSM's stops later become suggested hotspot boxes, or stay hints only?
3. The ODbL credit as worded in §4.
