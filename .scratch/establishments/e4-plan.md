# E4: editors' corrections to establishments, the plan

Step E4 of `.scratch/establishments` (README, "Editor corrections"). Written 2026-11-22, before any code. The owner's answers so far: corrections apply **nightly, with the map publish** (question 5), and there is **no editing on OpenStreetMap** for now (question 6).

## What it does

An editor picks an establishment on the studio's map and hides it, renames it or moves it. The next nightly publish writes the corrections into a small file. Every page that draws establishments applies that file: the basemap's own places (E1), the pawnshops and remittance centres (E3b), and later search (E3d). Commuters still read only Para's files (ADR 0001, 0004, 0007).

The OSM-derived files and the basemap's tiles are never edited. A correction is a row that says what to change, keyed by the OSM id. The monthly build stays as it is.

## One finding that shapes the plan

**The basemap's tiles carry the OSM id of every place.** In the z14 tiles recorded for the E3b screenshots (49,311 `poi` features), every feature has an id, and the id is `osm id × 10 + type`: node 1, way 2, relation 3. Matched against our own establishment files: 12,493 nodes, 1,627 ways, 70 relations, with no mismatch. For example, tile id `48931040211` is our `n4893104021`, "Recina Derm".

So the E1 layers can hide or rename a basemap place by its id with a MapLibre filter and expression. We don't need our own establishment tiles (the study's option (b)), and no R2 or Worker work.

The risk: this encoding is OpenFreeMap's (Planetiler's OpenMapTiles profile), not a promise. If it ever changes, hides on the basemap's places stop silently. A unit check against a committed tile fixture catches it at the next stand-in refresh, not live. See owner question 8.

## The pieces, one PR each

### E4a: the table (a migration the owner applies)

`supabase/migrations/<ts>_establishment_overrides.sql`, with paste files `supabase/apply/<ts>_establishment_overrides_{apply,check,revert}.sql`. Written, not applied. The owner applies it, records the ledger version and regenerates `src/shared/types/database.types.ts`.

```sql
create table public.establishment_override (
  source_id   text primary key check (source_id ~ '^[nwr][0-9]{1,12}$'),  -- 'n4893104021'
  hidden      boolean not null default false,
  name        text check (name is null or length(trim(name)) between 1 and 80),
  lng         double precision,
  lat         double precision,
  kind        text,            -- the marker's kind, kept with a move (see below)
  reason      text check (reason is null or length(reason) <= 200),
  editor_id   uuid not null default auth.uid() references auth.users on delete set null,
  updated_at  timestamptz not null default now(),
  check ((lng is null) = (lat is null)),
  check (hidden or name is not null or lng is not null)            -- a row always changes something
);
```

- **One row per place**, holding its current correction: hidden, and/or a new name, and/or a new position. Undo deletes the row. There is no history table, so question 2 asks whether one is wanted.
- **Who may do what.** Row security on.
  - Editors select, insert, update and delete, through `private.is_editor()` (0005's helper), as the draft tables do.
  - `anon` and `authenticated` non-editors get nothing on the table.
  - The publish reads through `public.establishment_overrides_published()`: security definer, `search_path` pinned, granted to `anon`. It returns only `source_id, hidden, name, lng, lat, kind`. No editor ids, no reasons, no times, so the publishable key reads exactly what goes public.
  - `scripts/publish/privacy-probe.mjs` gains the table, to prove `anon` can't read it directly.
- **Why not log every edit as its own row:** latest-wins needs a merge step, and a row per place applies in one pass. The publish is idempotent either way.
- `kind` exists because a **move** of a basemap place hides the tile's point and draws a replacement in Para's own layer. That layer needs the glyph, and the tile's class is known only at the moment the editor picks the place. The studio fills it.

### E4b: the nightly file, and applying it

**The publish.** `scripts/publish/publish-map.mjs` calls the function and writes `public/data/establishments/v1/overrides.json`:

```json
{ "licence": "ODbL-1.0", "attribution": "© OpenStreetMap contributors", "updated": "2026-11-23",
  "overrides": [["n4893104021", { "hidden": true }], ["w123", { "name": "SM Cubao" }], ["n77", { "lng": 121.05, "lat": 14.62, "kind": "pawnshop" }]] }
```

- **Sorted by id**, so an unchanged night writes a byte-identical file and nothing is committed. That's the publish's existing rule.
- **Ceilings:**
  - 5,000 overrides and 200 kB, checked by `scripts/establishments/check.mjs`;
  - an empty list is valid;
  - no shrink guard, because deleting every correction is a legitimate state.
- **Orphans** are corrections whose place is gone from the files: a node redrawn as a building, a closed shop deleted.
  - The publish checks each id against the committed cells. An orphan is a **warning** in "The map needs a look", never a failure.
  - It can't check ids of kinds only the basemap has (hospital, college, school, mall, department store). Those are listed as "not checkable" instead.
- **Index and file stay separate.** The monthly landmarks workflow owns `index.json` and the cells, and the nightly publish owns `overrides.json` alone. Neither rewrites the other's files, so the two workflows never conflict.

**Applying it** happens in the establishments' lazy chunk only, so the opening code stays +0:

- `routes/published/fetch-establishments.ts` gains `fetchEstablishmentOverrides()`: read once a page, validated with the same hand-written-guard pattern as the cells, so `zod` stays at 10,318 B.
- `routes/map/establishment-overrides.ts`, pure and unit-tested:
  - `tileIdOf('n4893104021')` gives `48931040211`;
  - the E1 layers' filter gains `['!', ['in', ['id'], ['literal', hiddenOrMovedTileIds]]]`;
  - their `text-field` becomes `['match', ['id'], …renamedIds, …names, ['get', 'name']]`;
  - E3b's `extraFeatures` drops hidden, renames and moves.
- **Moved places** of every kind are drawn in the `establishments-extra` source at their new position, with their kind's glyph and family. The source is renamed `establishments-para` once it holds more than pawnshops. Its minzoom follows the kind's tier (`TIER_ZOOM`), not the pawnshops' 16.
- **When it shows:** the file reaches commuters at the next 04:00 publish plus Cloudflare's deploy. With the offline worker's stale-while-revalidate cache, an installed app shows it one launch later.

### E4c: the studio panel

- **Picking.** On the studio's map, with no drawing tool active, tapping an establishment marker opens a card. Both kinds of marker can be picked: the tile layers give `feature.id`, and the Para layer gives `properties.osm`.
  - The card shows the name, the kind, the OSM id as a link to openstreetmap.org (for reading, not editing), and the current correction, if any.
  - **Hide.**
  - **Rename:** a text field with a visible label, 1–80 characters.
  - **Move:** drag the marker, or tap the new spot, then Save or Cancel. The same interaction as moving a hotspot, if the owner wants it the same.
  - **Undo correction:** deletes the row.
  - Every action says "Shows on the public map after tonight's publish".
- **Data**, all in `features/studio/data/`:
  - `establishment-override-keys.ts`;
  - `fetch-establishment-overrides.ts`, which reads the table as an editor;
  - `use-establishment-overrides-query.ts`;
  - `use-save-establishment-override-mutation.ts` and `use-undo-establishment-override-mutation.ts`, which invalidate the list.
  - A Zod schema maps `source_id` to `sourceId`.
- **The studio applies its own query, not the nightly file.** An editor sees a correction at once.
  - Hidden places stay visible in the studio, ghosted, so they can be un-hidden (question 7).
  - The Public map view (`public-view/`) applies the published file instead, so the editor can compare the two.
- **A list of corrections**, a small sheet: every correction, the editor's name, its reason, its orphan state. Filter by hidden, renamed or moved.
- **Look:** the owner's Figma. Until then the existing card and `card-actions` components, with nothing invented. Stories for every state: default, hidden, renamed, moved, saving, error, orphan, long name.

### Tests

- **Unit:**
  - the id encoding, both ways, including relations;
  - the filter and the `match` expression built from a fixture;
  - `extraFeatures` with each kind of correction;
  - the overrides file's schema and ceilings;
  - the publish's orphan report against fixture cells.
- **Stand-ins:** the studio suites' Supabase stand-in gains the table and function.
  - A studio e2e test hides, renames, moves and undoes one place.
  - The commuter suite reads a committed `overrides.json` fixture and checks a hidden place is gone and a renamed one reads its new name.
  - Network 0 throughout.
- **The encoding guard:** one recorded z14 tile, committed beside the stand-in basemap with its licence, and a unit check that its ids decode to known OSM ids.

## Order and who does what

1. **E4a.** Me: the migration, paste files, check and revert, and the README row "not applied live". **The owner applies it** and regenerates the types. I then record the ledger version.
2. **E4b.** Me, after E4a is live, because the publish reads the function. Until then the publish skips the overrides when the function answers 404, with a warning. The `.github` workflow doesn't change, because `publish-map.mjs` already runs nightly.
3. **E4c.** Me, after E4b, once the owner's Figma for the card exists, or on placeholders if the owner says so.

Every PR: `npm run check` before push, one PR in CI at a time, the hub's go before each merge.

## Weight

- **Opening code:** +0. Everything is in the establishments' lazy chunk, and the studio code is in the studio's bundle.
- **Lazy chunk:** about +1 kB gz (the apply functions).
- **`overrides.json`:** under 1 kB with dozens of corrections, about 60 B per correction. It's fetched once per page that shows establishments.

## Questions for the owner

1. **Which corrections?** Hide, rename and move, as the hub listed? Or also **recategorise** (a "clinic" that's a pharmacy) and **add** (a place OSM doesn't have, with no OSM id)? Adding needs an id scheme of our own (`p<uuid>`) and a kind picker. Recommended: not in E4.
2. **History.** One row per place, its current correction, with undo deleting it? Or a log of every change, who and when? Recommended: one row, with the editor and time on it.
3. **Reason.** Required, optional, or not asked? Recommended: optional, shown in the studio's list only, never published.
4. **Who.** Every editor, straight to tonight's publish? Or through a draft and publish step like routes? Recommended: every editor, direct. A correction is small, reversible and leaves the OSM data untouched.
5. **The look.** The pick card, the move interaction, the ghosted hidden marker and the list sheet need Figma frames. Placeholders until then?
6. **Orphans.** Only in "The map needs a look" issue, or also flagged in the studio's list? Recommended: both.
7. **Hidden places in the studio.** Ghosted, so they can be un-hidden, or gone as on the public map? Recommended: ghosted.
8. **The tile-id dependency.** Accept that hiding a basemap place relies on OpenFreeMap's id encoding, guarded by a unit check at each stand-in refresh? The alternative is Para's own establishment tiles in R2 (the study's option (b)), which needs a Worker deploy and an upload by the owner.
