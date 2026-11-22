# Establishments on the map: a feasibility study

Status: study done 2026-11-22; the owner answered the same day, and the build has started (Answers and the build, below).

The owner wants the map to feel richer, closer to Google Maps: ATMs, banks, shops, restaurants, pharmacies, convenience stores and the like, and search for them later. This study asks where such places could come from legally, how good they are in Metro Manila, how heavy they would be, and how Para could carry them without breaking its rules: commuters read only files Para publishes (ADR 0001), nothing leaves the phone (ADR 0004), and Para serves its own basemap (ADR 0007).

**Short answer:** yes, from OpenStreetMap, the same data the landmark file and the basemap already use. One file for search, about 350 kB gzipped for Metro Manila, and pins drawn from our own tiles or that file. Overture Maps would add about three times as many places, but they are noisier and bring a second licence. Treat Overture as a later step, if ever. Google is ruled out (below).

## What Para already has

- **The basemap already holds these places.** The monthly tiles (`scripts/tiles/build.sh`, Planetiler's OpenMapTiles profile, Geofabrik's Philippines extract) carry OpenMapTiles' `poi` layer at zoom 14. Its mapping (`openmaptiles/layers/poi/mapping.yaml`) includes `atm`, `bank`, `pharmacy`, `cafe`, `fast_food`, `fuel`, `clinic`, `school`, `convenience` and `supermarket`. Monochrome draws them as gray dots (`src/features/routes/map/monochrome.ts`), and the Map Style card's **Location Labels** switch hides them on the public map by default (`location-labels.ts`). So part of "a richer map" is a style decision. It costs no new download, but tiles are not a search index and editors cannot correct them.
- **Place search already has a pattern to copy.** `scripts/landmarks/build.sh` filters openstreetmap.fr's Metro Manila extract with osmium. `landmarks.mjs` writes `public/data/landmarks.v1.json` (6,880 places, 757 kB, 3 MB ceiling). Search loads it on the first keystroke, the offline worker keeps it, and `.github/workflows/landmarks.yml` rebuilds it monthly as a pull request. The footbridge file (`footbridges.v1.json`, 500 kB ceiling) shows the other half: a data file fetched only at street level and drawn by our own layer.
- **A gap found on the way.** openstreetmap.fr's extract is the **NCR outline only**. The public map's panning box (`METRO_MANILA`, 120.6–121.5 E, 13.6–15.05 N) reaches Bulacan, Rizal, Cavite and Laguna. Today's landmark file therefore has nothing past the NCR line, for example Antipolo or Bacoor, while the basemap, built from the Philippines extract, does. An establishments build should use the Philippines extract in GitHub Actions, as the tiles build does. The landmark file may want the same fix (question 7).

## 1. Sources and their licences

| Source | Licence | Attribution | Share-alike | Updated | Reachable from here |
| --- | --- | --- | --- | --- | --- |
| OpenStreetMap | ODbL 1.0 | "© OpenStreetMap contributors", and say the data is ODbL | **Yes**, for a derived database | Continuously; extracts daily | Yes (openstreetmap.fr; Geofabrik from Actions) |
| Overture Maps Places | Mixed, per row: CDLA-Permissive-2.0 (Meta, Microsoft, others), Apache-2.0 (Foursquare rows), CC0 (AllThePlaces rows) | The licence text or notice per source; no single string | No | Monthly | Yes, anonymous S3 |
| Foursquare OS Places | Apache-2.0 | Keep the full NOTICE.txt and a copy of the licence | No | Monthly releases (paths dated `dt=2026-11-17`) | **No**: gated, needs an account and a token |
| AllThePlaces | CC0 1.0 | None required | No | Weekly | Not tried; brand chains only |
| Google Maps | Proprietary | – | – | – | **Ruled out** |

What the official pages say. These quotes were fetched on 2026-11-22.

- **OpenStreetMap** ([openstreetmap.org/copyright](https://www.openstreetmap.org/copyright)): "OpenStreetMap is _open_ data, licensed under the Open Data Commons Open Database License (ODbL)". Further: "You are free to copy, distribute, transmit and adapt our data, as long as you credit OpenStreetMap and its contributors." And: "Make clear that the data is available under the Open Database License." Share-alike: "If you alter or build upon our data, you may distribute the result only under the same license." Para already meets these duties: the landmark file carries `license`, `attribution` and `license_note`, and the map's corner credits OSM. The OSMF's guidelines on Produced Work and Collective Databases (osmfoundation.wiki) **did not resolve from this container**, so the mixing question below rests on the licence alone and needs a reading of those guidelines.
- **Overture** ([docs.overturemaps.org/attribution](https://docs.overturemaps.org/attribution/)): "Some of the data sources we use in Overture datasets require their own attribution, according to their licenses." The page was cut short before its Places section. The per-row licences above come from the data itself: each place's `sources[].license`. In the panning box, 612,403 places, every place has an `Overture` source row and 594,300 also have a `meta` row, all CDLA-Permissive-2.0. Also: 11,192 Foursquare rows (Apache-2.0), 3,136 Microsoft, 3,021 Uberall and 2,364 AllThePlaces (CC0). Cadence ([release calendar](https://docs.overturemaps.org/release-calendar/)): "Overture has been releasing data monthly since October 2023". Old releases are kept "a maximum of 60 days".
- **CDLA-Permissive-2.0** ([cdla.dev/permissive-2-0](https://cdla.dev/permissive-2-0/)): "A Data Recipient may share Data, with or without modifications, so long as the Data Recipient makes available the text of this agreement with the shared Data." And: "This agreement does not impose any restriction or obligations with respect to the use, modification, or sharing of Results."
- **Foursquare OS Places** ([Hugging Face](https://huggingface.co/datasets/foursquare/fsq-os-places)): "Foursquare OS Places is now a gated dataset on Hugging Face." Access requires that "You need to agree to share your Hugging Face information to access this dataset". Licence: "available under the Apache 2.0 license". Foursquare's own docs ([access page](https://docs.foursquare.com/data-products/docs/access-fsq-os-places)) say "OS Places is now delivered through the Foursquare Places Portal", which requires an account and a token. Its public bucket (`fsq-os-places-us-east-1`) now holds only `LICENSE.txt` and `NOTICE.txt`. NOTICE asks reusers to "preserve attribution to Foursquare, including preserving the full content of this NOTICE.txt file". **Not downloaded:** it needs the owner's account and a token stored outside the repo. Foursquare rows already reach Overture: 11,192 in the box, about 2%.
- **AllThePlaces** ([alltheplaces.xyz](https://www.alltheplaces.xyz/)): "released under Creative Commons' CC-0 waiver", "updated weekly". It holds chains' own store locators, such as banks, pharmacies and convenience chains, and is good for checking chain branches. It is not a full source.
- **Google Maps**: the brief rules it out, because its terms forbid scraping and forbid showing its place data on a non-Google map. The Platform Terms page ([cloud.google.com/maps-platform/terms](https://cloud.google.com/maps-platform/terms)) **did not render** for the fetcher, so section 3.2.3 is not quoted here. Nothing here used Google, and nothing should.

**Mixing sources.** OSM data plus anything else in one database makes a derived database of OSM, and ODbL's share-alike then covers the whole file. Overture's CDLA-Permissive rows may be shared under other terms as long as the CDLA text goes with them. The Foursquare rows need their NOTICE kept. The simple way to keep each licence clean is separate files or layers, one per source, each with its own header. Merging into one file is possible, but a merged file is ODbL plus the CDLA text plus Foursquare's NOTICE, and that combination needs a lawyer's reading (question 4).

## 2. Coverage in Cubao

**Test box:** west 121.0437, south 14.6106, east 121.0623, north 14.6286. That is about 2 × 2 km centred on the Araneta Coliseum (14.6196, 121.0530): Araneta City, Gateway, Farmers Plaza, Ali Mall, and Cubao along EDSA and Aurora.

**Data:** OpenStreetMap from openstreetmap.fr's Metro Manila extract of 2026-11-17, filtered with osmium (the filter is under How it was measured). Overture from release `2026-11-18.0`. Each place was assigned to one category by `count-places.py`; the mapping from each source's tags is in that file.

| Category | OSM | Overture, all | Overture, confidence ≥ 0.5 |
| --- | ---: | ---: | ---: |
| ATM | 9 | 15 | 12 |
| Bank | 58 | 73 | 65 |
| Pharmacy | 28 | 41 | 32 |
| Convenience store | 78 | 53 | 40 |
| Supermarket (Overture: and grocery) | 15 | 79 | 39 |
| Restaurant and fast food | 225 | 649 | 422 |
| Café (Overture: coffee and milk tea) | 36 | 138 | 81 |
| Gas station | 20 | 28 | 28 |
| School, college, university | 25 | 120 | 84 |
| Hospital, clinic, dentist, doctor | 47 | 245 | 197 |
| **All** | **541** | **1,441** | **1,000** |

Over all of Metro Manila (the NCR outline, the same area for both sources):

| | ATM | Bank | Pharmacy | Convenience | Supermarket | Food | Café | Fuel | School | Health | All |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| OSM | 870 | 3,258 | 1,733 | 3,884 | 758 | 10,413 | 2,088 | 1,166 | 2,508 | 2,491 | 29,169 |
| Overture ≥ 0.5 | 301 | 3,740 | 2,253 | 2,463 | 2,160 | 23,759 | 5,969 | 1,544 | 6,941 | 9,263 | 58,393 |

Readings:

- **OSM is strongest where commuters need it most:** convenience stores (78 against Overture's 53), banks and ATMs near parity, and fuel. In OSM, 2,026 of 3,577 banks also carry `atm=yes`, so an ATM search should read that tag as well as `amenity=atm`.
- **Overture has about 2.7× OSM in Cubao,** mostly in food, cafés, clinics and schools. It is the long tail of small businesses that list themselves on Facebook. 97% of its rows come from Meta.
- **The sources overlap little.** Of 527 named OSM places in the box, 198 have an Overture place of a similar name within 100 m; of Overture's 1,441, 201 have an OSM one. Each source has many places the other lacks.

### Spot check: 20 random places per source

Google could not be the reference, so each place was judged against OSM's own streets and buildings and against the other source:

- whether the name reads as a real business and fits its category;
- how far the point is from the nearest OSM road centre line, and whether it falls inside a mapped OSM building;
- whether the other source has a similar name within 100 m;
- for well-known places, whether the point falls in the right building (Gateway, Farmers Plaza, Ali Mall).

`spot-check.py` prints the tables. Seeded shuffle, seed 20261122.

**OSM, 20 of 20 plausible.** Every name is a real-looking business with a fitting category: Zark's Burger, Mercury Drug, Din Tai Fung at Gateway 2, Starbucks, Mang Inasal, small "Mart" stores. Every point is inside a mapped building, 7–21 m from a road. Four of them, Zark's Burger, The Coffee Project, Samgyup Day and Mercury Drug, have an Overture twin.

**Overture, 15 of 20 plausible, 5 doubtful.** The doubtful five:

- Two security-guard training centres filed as "school" and "middle_school".
- "College of Hospitality Management - Cubao" at confidence 0.40, sitting 4 m from a road's centre line.
- "A-Billy-Tea" at confidence 0.31 and "Nialas 3 Toppings Pizza" at 0.40, both sitting on a road's centre line. These are likely real small shops, but in the wrong place.

The other fifteen, such as KFC at 1.00, Pedro Tuason Elementary School, Bank of Commerce and several dental clinics, look right. Nine of the twenty points lie outside any building, three of them on the street itself.

Outside the sample, a looser category mapping turned up more problems:

- a gas station named "Cubao, EDSA, Manila, Philippines";
- a bakery filed as a Turkish restaurant;
- "Redribbon M2 Warehouse, Santolan" placed in Cubao, though Santolan is about 4 km away;
- an internet café filed under cafés.

The fuzzy name match used here is crude. It paired "Calixto Dental Clinic" with "CLN. Dental Clinic", so the overlap counts are approximate.

**Position across the whole box:**

| | Places | Inside a mapped building | Within 3 m of a road's centre line | Same name twice within 50 m |
| --- | ---: | ---: | ---: | ---: |
| OSM | 541 | 434 (80%) | 23 (4%) | 3 |
| Overture | 1,441 | 746 (52%) | 222 (15%) | 1 |

OSM places were placed by people who mapped the building. Overture's are often address geocodes that land on the street. On a commuter map, a pin in the middle of EDSA is the wrong signal.

## 3. Size

Only named places count, with points rounded to 5 decimals (about 1 m). "Compact" is one array per place, `[name, category, lng, lat]`, the shape a search file would use. GeoJSON adds `{type, properties, geometry}` around each place.

| File | Places | Compact | Compact, gzipped | GeoJSON | GeoJSON, gzipped |
| --- | ---: | ---: | ---: | ---: | ---: |
| OSM, NCR | 27,316 | 1.09 MB | **348 kB** | 4.02 MB | 505 kB |
| Overture ≥ 0.5, NCR | 58,393 | 2.72 MB | 866 kB | 8.97 MB | 1.21 MB |
| Overture ≥ 0.5, panning box | 107,518 | 5.08 MB | 1.62 MB | 16.6 MB | 2.25 MB |
| Overture, all, panning box | 152,940 | 7.14 MB | 2.34 MB | 23.6 MB | 3.23 MB |

Vector tiles: tippecanoe 2.49 from apt, one `places` layer, every place kept at every zoom.

| PMTiles | z12–14 | z12–16 | One z14 tile over Cubao | z14 tiles: median / p95 / max |
| --- | ---: | ---: | ---: | --- |
| OSM, NCR | 1.56 MB | 3.13 MB | 11.0 kB | 3.1 / 12.6 / 18.9 kB |
| Overture ≥ 0.5, panning box | 7.45 MB | 14.9 MB | 23.4 kB | 0.4 / 8.1 / 44.6 kB |

Against Para's ceilings (`scripts/checks`, `scripts/landmarks`, `scripts/footbridges`):

- **Search file.** No budget exists yet. The landmark file's 3 MB ceiling is the nearest yardstick. OSM compact, at 1.09 MB raw, fits it. Overture's panning box at 5–7 MB does not, and would have to be split by area or category. Folding establishments into `landmarks.v1.json` (757 kB) would push it to about 1.9 MB and make every first search download that much. Keep a file of its own, loaded on first search or first category tap.
- **Drawn layer.** The footbridge file's 500 kB ceiling is for street-level data. OSM GeoJSON (4 MB raw, 505 kB gzipped) is too heavy to fetch whole for drawing. Tiles fit: about 11 kB extra per z14 tile in the densest part of Cubao, one file in R2 beside the basemap's.
- **App code.** The JS budgets in `build-weight.mjs` (the public page's shared chunk, 414 kB gz) do not change. Data is fetched, not bundled. A new layer adds only a few kB of style code.
- **Static assets.** Cloudflare caps a static asset at 25 MiB, so every OSM file fits. A tile archive goes to R2, like the basemap.

## 4. Design sketch, no code

### Pipeline

A sibling of `scripts/landmarks`, `scripts/establishments/`, run from the same monthly workflow as a pull request:

1. Download the **Geofabrik Philippines extract** in Actions (the tiles build already fetches and checks it), so the whole panning box is covered.
2. Filter it with osmium: `nwr/amenity=atm,bank,pharmacy,restaurant,fast_food,food_court,cafe,fuel,school,college,university,kindergarten,hospital,clinic,doctors,dentist`, `nwr/shop=convenience,supermarket,chemist` and `nwr/healthcare`. The exact list is the owner's (question 1).
3. `establishments.mjs` writes one point per place, as `landmarks.mjs` does: an area's centroid, OSM id, name, category, brand, and `atm: true` for banks with an ATM. Later, optionally, opening hours.
4. Write **`public/data/establishments.v1.json`**, with the same header fields as the landmark file (licence, attribution, licence note, source, extract date) and one place per line, so a monthly diff reads as the places that changed. Give it a ceiling and a check (`check.mjs`) on schema, size and a minimum count per category. Refuse a run that loses more than 20% of the places, as `landmarks.yml` does.
5. For drawing, pick one of:
   - **(a)** The basemap's own `poi` layer, styled. No new build, but OpenMapTiles' class buckets and rank limits decide what is there, and editors cannot change it.
   - **(b)** Our own tiles. tippecanoe or Planetiler's custom profile turns the same points into `establishments.pmtiles` in R2, served by the tiles Worker, so overrides apply.
   - **(c)** A GeoJSON layer cut by area. Simple, but heavier and not how the map scales.

   Recommended: **(a) first, (b) once overrides exist.**

Commuters reach only Para's files and Para's tiles host. The build is the only thing that touches OpenStreetMap.

### Deduplication, if sources are ever combined

- Keep each source as its own layer and file. Dedup happens only where a source's place would otherwise be shown twice: OSM wins, because its positions are better (80% inside buildings, against 52%).
- Two places are the same when:
  - they share a brand: OSM `brand:wikidata` equals Overture `brand.wikidata`, within 150 m;
  - or their folded names match, by containment or a similarity of at least 0.85, and their categories are compatible, within 50 m; or within 100 m for a large site such as a mall's tenants.
- Use category, not only name. The Calixto and "CLN. Dental Clinic" false match shows why.
- Never move a point toward the other source's point. Pick one.
- From Overture, take only confidence ≥ 0.7, drop points on a road centre line or with an address-like name, and take only the categories OSM is thin on (food, cafés, clinics). That avoids most of the errors found above.

### Drawing (the owner designs the look)

The rules the build and the layer need, with the look left to the owner's Figma:

- **Zooms.** Nothing below about z15, so the network view stays Para's routes and hotspots. Then the categories a commuter acts on: ATM, bank, pharmacy, convenience store, supermarket, gas station. At z16 and closer, everything else: food, cafés, schools, clinics. Para's hotspots, route lines and labels always win collisions (`symbol-sort-key`, our layers above).
- **No clustering bubbles.** A count bubble reads like a hotspot or a stop. MapLibre's symbol collision, plus a rank such as chain or brand first, thins the pins at mid zooms instead.
- **Accessibility.** Colour is never the only signal: one icon per category, with its name on tap. What is shown only on the map must also exist as text: a "Nearby" list on a hotspot's or landmark's sheet (ATMs, pharmacies and convenience stores within a few hundred metres), which also serves search.
- **The Location Labels switch** already gives commuters a way to hide the basemap's own words. The owner decides whether establishments follow it or have a switch of their own (question 3).
- **Credit.** © OpenStreetMap contributors is already in the map's corner. If Overture is ever drawn, its attribution joins it.

### Search

- `establishments.v1.json` is loaded on the first search, in a chunk of its own, beside the landmark file, and kept by the offline worker (stale-while-revalidate). It is folded and filtered as landmarks are in `routes/model/landmark-search.ts`.
- **By name.** "Mercury Drug" lists the nearest branches first, using the position the page already holds. The position stays on the phone (ADR 0004).
- **By category word.** "ATM", "pharmacy", "botika", "7-Eleven", "gas" give the nearest few. The words and their Tagalog forms are a small table, owned in `CONTEXT.md`.
- **Results order:** Para places, then landmarks, then establishments.
- **Reuse.** Picking an establishment reuses routes near here and Go here (tickets 03 and 07) without change, since an establishment is just another landmark-shaped point.

### Editor corrections ("a good database upgrade")

The file stays the commuters' only source. The studio writes **overrides**, and the build applies them.

- **A table**, `establishment_overrides`, one row per change:
  - `source` (`osm`) and `source_id` (`n123`, `w456`);
  - `action`: `hide`, `rename`, `move`, `recategorise`, or `add` for a place no source has;
  - the new value, the reason, and the editor and time.
- **Who reads and writes.** Row Level Security lets editors write, and lets the build read with the publishable key, as the nightly publish reads the route tables today.
- **In the studio**, a small panel on a picked establishment: hide, fix name, fix position, fix category. The look is the owner's.
- **The build.** The monthly build, or the nightly publish if corrections should show sooner, reads the overrides and applies them while writing the file and the tiles. It reports **orphans**, overrides whose OSM id disappeared (a node redrawn as a building, say), so an editor can re-attach or drop them.
- **Fix facts upstream.** A place that closed, or a wrong name, is best fixed on OpenStreetMap itself, by an editor with an OSM account. Every map benefits, and the next monthly build picks it up. An override then covers only what is Para's choice, such as hiding clutter near a terminal, or a gap until OSM catches up.
- **Licence.** Overrides applied to OSM data make the published file a derived ODbL database. It already is one, and it is public, so share-alike is met. Keep the header's licence note.
- **Not recommended:** importing all ~30,000 places into Supabase and editing them there. It doubles the database, makes every monthly refresh a merge against editors' changes, and the publish's 30%-loss guard would trip on normal churn. Overrides keep the database small and the source of truth clear.

## 5. Recommendation

1. **Now, cheaply:** let the owner try the basemap's own POIs. They are in the tiles already, so it is a style change in Monochrome, Coloured and Dark: which categories, which zooms, which icons. No data work and no new download. It is the fastest way to see whether a richer map feels right on a commuter map.
2. **Then, search:** `establishments.v1.json` from OpenStreetMap, about 1.1 MB raw and 350 kB gzipped for the NCR. A little more over the panning box from the Philippines extract, likely still under 3 MB raw, but not measured, because Geofabrik is unreachable from these containers. Built monthly beside the landmark file, under the same licence and credit. Category words ("ATM", "botika") plus name search, nearest first.
3. **Then, corrections:** the overrides table and a studio panel, plus our own establishments tiles so hidden places vanish from the map too.
4. **Overture: not now.** It would roughly double the places, mostly small eateries, cafés and clinics, which is what makes Google feel full. The costs:
   - 5 of 20 sampled points were doubtful (wrong category, on the road), and the looser pass found junk names too;
   - 15% sit on road centre lines;
   - it adds a second licence regime and a dedup step;
   - a file 2.5–6× heavier.

   Revisit it as a filtered gap-filler, confidence ≥ 0.7 and in the food, café and clinic categories only, in its own layer, if the owner finds OSM too sparse after step 1.
5. **Foursquare: no.** It is gated behind an account and a token now, and its rows already reach Overture.
6. **Grow OSM instead.** Contributors already ride and record. A light "this place is missing" note in the contributor app or the studio, which an editor turns into an OSM edit, improves Para and every other OSM map at once.

Trade-offs in one line: OSM is clean, legally simple and compact, but thinner on food and clinics. Overture is fuller but noisier, heavier and licence-mixed. Google is not an option.

## Questions for the owner

1. **Which categories?** The study used ATM, bank, pharmacy, convenience, supermarket, food, café, fuel, school and health. Should malls' tenants, pawnshops ("Palawan", "Cebuana", bayad centers), remittance centres, laundry, sari-sari stores, public toilets or police be added? Pawnshops and remittance centres are where many commuters pay bills.
2. **Drawing first or search first?** Recommended: drawing from the basemap's POIs first (a style change, no data work), then the search file.
3. **One switch or two?** Should establishments follow Location Labels, which is off by default on the public map, or have a switch of their own, or always show at street zoom?
4. **Overture, ever?** If yes, as its own layer only, and is the owner comfortable shipping CDLA-Permissive and Apache NOTICE texts beside the ODbL file? A lawyer's reading of the OSMF's Collective Database guideline is advised before any merge into one file.
5. **Corrections: how fast?** Monthly, with the extract, or nightly, with the publish? Nightly means the publish workflow learns to rebuild the establishments file too.
6. **Fix on OpenStreetMap?** Will Para's editors also fix wrong places on OpenStreetMap itself, under an OSM account of Para's or their own? That is the durable fix and needs a short how-to.
7. **The landmark file's area gap.** Move both files to the Geofabrik Philippines extract, built in Actions, so the provinces inside the panning box are covered? This is a separate small change.

## Answers and the build (2026-11-22)

The owner's answers, through the hub:

1. Categories: the study's, plus pawnshops and remittance centres (Palawan, Cebuana, bayad centers), laundry, sari-sari stores, public toilets and police.
2. Drawing first.
3. Location Labels on by default on the public map, and establishments follow it.
4. Overture yes, as its own layer, never merged into the ODbL file, with its licence and NOTICE texts shipped.
5. Corrections apply nightly, with the map publish.
6. No editing on OpenStreetMap for now.
7. Move to the Geofabrik Philippines extract, built in Actions.

Design direction for the markers: Apple Maps' pattern, not its assets. Round markers in a colour per family with a white glyph, the marker alone first and its name beside it a zoom closer, collisions thinning them, the big places before the small shops.

The build, one pull request each, into staging:

| Step | What | Status |
| --- | --- | --- |
| E1 | The basemap's own places drawn as establishments (`src/features/routes/map/establishment*.ts`), Location Labels on by default on the public map, the contributor page keeping its own choice | Merged (#1142) |
| E2 | Landmarks and footbridges from the Geofabrik Philippines extract, covering the whole panning box | Merged (#1138; the files in #1140) |
| E3 | E3a: the establishment files from OpenStreetMap, `public/data/establishments/v1/`, an index and a file per 0.05° cell (the hub's call: one file would be 4–5 MB). E3b: a layer for pawnshops, remittance and bayad centers, which the basemap's tiles lack. E3c: Overture as a layer of its own. E3d: search, once search is shown | E3a in review |
| E4 | Editors' corrections (hide, rename, move) in a Supabase table, applied by the nightly publish | Planned |

E1's markers, for the owner's Figma: eight families as tokens (`--map-establishment-<family>-surface` in `tokens.css`), glyphs from Maki 8.2.0 and Temaki 5.13.0 (both CC0, vendored with their licences in `establishment-icons/`), a legend in Storybook (Features/Routes/EstablishmentMarkers). The basemap's tiles have no class for pawnshops, remittance centres or bayad centers, so those wait for E3.

## How it was measured

Everything was downloaded into the session's scratch folder, never into the repo, on 2026-11-22.

- **OpenStreetMap:** `https://download.openstreetmap.fr/extracts/asia/philippines/metro_manila.osm.pbf` (61.8 MB, MD5 checked, extract of 2026-11-17), its outline `polygons/asia/philippines/metro_manila.poly`, and `osmium-tool` 1.16 from apt. Filter:

  ```
  osmium tags-filter metro_manila.osm.pbf \
    nwr/amenity=atm,bank,bureau_de_change,pharmacy,restaurant,fast_food,food_court,cafe,fuel,school,college,university,kindergarten,hospital,clinic,doctors,dentist \
    nwr/shop=convenience,supermarket,chemist,department_store,mall nwr/healthcare -o pois.osm.pbf
  osmium export pois.osm.pbf -f geojsonseq --add-unique-id=type_id -o pois.geojsonseq
  ```

  This gave 36,453 features. The context for the spot check was `osmium extract -b 121.040,14.607,121.066,14.632`, then `tags-filter w/building r/building w/highway`.
- **Overture:** `overture-pull.py`, release `2026-11-18.0`, panning box, 612,403 places, 66 MB Parquet. It uses duckdb from pip, outside the repo and not in `package.json`.
- **Foursquare:** not downloaded (gated). **Geofabrik:** not reachable from these containers (the tiles build's own note), so OSM was measured over the NCR outline only.
- **Scripts in this folder:**
  - `overture-pull.py`;
  - `count-places.py`: category mapping, counts, sample and weights;
  - `spot-check.py`: the spot-check tables, overlap and position statistics (`--stats`).

  All are Python 3 with duckdb, study tools only.
- **Tiles:** tippecanoe 2.49 from apt, run as `tippecanoe -l places -Z12 -z14 -r1 --no-feature-limit --no-tile-size-limit`. Per-tile sizes were read from an `.mbtiles` build at z14.
- Nothing here opened a browser, used a key, or touched Supabase or the app.
