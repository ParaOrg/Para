# Studio maps: Contributors, Playground, Public

Updated 2026-10-17 with the owner's direction: the driver app became contributors (`../contribute/spec.md`), and the studio's three maps became **Contributors | Playground | Public** (they were Drafts | Tracking | Public).

## What it is

The studio gets **three maps behind one switch** at the top:

- **Contributors:** every contribution, messy, editors only. For studying and cleaning the data, and for machine learning later.
- **Playground:** where editors draw and change routes and hotspots. Every route and hintuan goes **Draft → Pending → Approved** here.
- **Public:** what commuters see.

Only approved work reaches commuters, at that night's publish.

**Why the review step:** since 0015 (2026-10-14) three editors draw and change every route. Without a review step, every experiment reaches commuters at the next nightly publish.

**ADR 0001.** Its consequence "a change the editor saves is seen by visitors when it is published" becomes "a change is seen once it is approved, then published". That's a new ADR, 0003, drafted in `../contribute/rule-changes.md`. ADR 0001's decision itself stands: commuters read static files, never the database.

## Words (for `CONTEXT.md`)

The proposed entries are in `../contribute/rule-changes.md`. In short:

- **Draft:** a route or hotspot being drawn or changed. Only editors see it. One at a time per route or hotspot.
- **Pending:** a draft submitted for review.
- **Approved:** what commuters get at the next publish.
- **Send back:** return a pending draft to its editor, with a note.
- **Take down:** remove an approved route or hotspot from the public map at the next publish. **Put back** undoes it.
- **Contributors map**, **Playground**, and **Public** (the studio's view of the public map).
- **Editor:** the entry is already up to date (since 0015, every editor edits every route and hotspot).
- _Avoid_: **staging** (that's the owner's staging site, the `staging` branch's preview, `wrangler.jsonc`); **push** (replaced by Approve); **Drafts map** and **Tracking map** (the old plan's names).

## The switch

- **Always on screen at the top: Contributors | Playground | Public,** in the owner's order. Each choice has a word and an icon, not colour alone. Never in a menu: an editor must always see which map they're on.
- **Not "Change map":** the layers button at the top right (`basemap-control.tsx`), which opens the Map Style card, changes how the map *looks*. This switch changes what it *shows*.
- **The address remembers the choice:** `/studio/?map=contributors`, `playground` or `public`. It can't be `/studio/contributors`: the host answers any unknown address with the public map's page (`wrangler.jsonc`).
- **Switching keeps the camera** (the same place and zoom) and the basemap. A half-drawn line survives.
- **The Playground opens by default,** since it is where editors work (an open decision: the switch reads Contributors first).

## Draft → Pending → Approved

For routes and hotspots alike. The database design is in `../contribute/database.md`, §8.

| Status | Who acts | Buttons |
| --- | --- | --- |
| **Draft** | The editor drawing it | **Submit** · **Discard** |
| **Pending** | Any editor, the one who drew it included | **Approve** · **Send back** (with a note; it returns to Draft) |
| **Approved** | Reaches commuters at that night's publish | **Take down** |
| **Taken down** | Gone from the public map at the next publish | **Put back** |

**Rules:**

- **Any editor can approve, their own work included** (the owner's call, 2026-10-15). Pending still marks work as finished and ready, apart from drafts in progress.
- **Save in the Playground saves the draft,** never the approved version. Editing an approved route or hotspot starts a new draft; commuters keep the approved version until the new one is approved.
- **One draft at a time per route or hotspot** (the owner's 8a). Another editor sees "being changed by X" and can look, not change. A draft left 7 days without a change can be discarded by another editor, after a confirm (an open decision).
- **A route can't be approved without its two end places approved.** Approving a route offers to approve its pending hotspots too.
- **A hintuan can be approved alone.** Approved routes that pass it gain it on their timelines.
- **A hotspot that ends an approved route can't be taken down** until the route is.
- **Links come from approved lines and boxes only,** worked out when something is approved. A draft hintuan never appears on a public timeline.
- **On the day this ships, everything already in the database is marked Approved,** so commuters see no change.

## The three maps

### Contributors (editors only)

What contributors recorded, as it came: messy, with gaps and junk. Nothing on it is ever public.

- **Every contribution as a faint line** (its thinned line), read in slices: a date range (the last 7 days by default) and the area in view, never the whole table.
- **Filters:** date and area. Hidden recordings are left out unless "Show hidden" is on.
- **Hintos as circles sized by their minutes.** Each is marked "inside hintuan X" or "no hotspot here", worked out from the approved boxes when the map is drawn. Many hintos at one spot suggest a hintuan.
- **A list beside the map** of the contributions in view, so everything on the map is also text: date, minutes, distance, what was ridden, the start and end names, the description, the minutes lost to gaps, and the phone's short code.
- **Use this line:** a contribution's line goes to the Playground as a draft direction. It is snapped to the roads at that moment (the router is a shared public server, so only on use). The editor picks which route and direction it is, or a new route by its two ends, with the contributor's start and end names shown as hints.
- **Draw a hintuan here:** from a hinto or a cluster of them, switches to the Playground with the box started.
- **Hide a recording,** with a note. Hidden is not deleted, and can be undone.
- **Block a phone,** with a note. The database refuses its next contributions. Unblock undoes it.
- **`contribution_use`:** Use this line and Draw a hintuan here each record which contributions the new direction or hotspot came from. These are the labels for machine learning later.
- Otherwise read-only.

### Playground (editors only)

- Today's studio tools, saving drafts.
- Draft, pending and taken-down items are marked.
- **"Being changed by X"** on another editor's draft.
- **A review list** of everything pending: who drew it (each row records its maker, 0015), with the approved version beside the new one. **Approve** or **Send back**.

### Public

- The published map, read the same way commuters read it: exactly what commuters see. Read-only.
- **Take down** and **Put back.**
- **A "waiting for tonight's publish" list** of what was approved, taken down or put back since the last publish. Without it, the map looks unchanged after an approval and it seems to have failed.

## Confidence (later)

Every direction has carried `confidence`, either **drawn** or **verified**, since `0001_init.sql`: "Nothing is 'verified' until it has been ridden with a GPS trace." Contributions are that trace. A direction becomes **verified** when enough contributions match its line; how many, and how close, is decided with real data.

- **Status** says whether it's ready for commuters. Editors decide it.
- **Confidence** says whether people have ridden it. The data decides it.

A route can be approved but only drawn. **Later:** a "verified" mark on the public map, showing counts only, never a contributor or a time.

## The publish

- The nightly publish (`scripts/publish/publish-map.mjs`) reads the database as `anon`, and `anon` reads **approved rows only** (the new read rules). Its queries don't change.
- **Take down and the 30% guard** (ADR 0001): the publish reads the takedowns since its last file and counts those rows as deliberate, so taking down routes on purpose doesn't trip the guard, while a policy slip that hides everything still does. "Run workflow" with Force stays as the fallback.
- **No contributor data, proved on every run:** the publish asks for a row from each contributor table with the publishable key and fails if one comes back, and checks that no file it writes names a contribution.
- **Undoing a publish:** git keeps every published version.

## Build order

The tickets are in `issues/`; the contributor page's are in `../contribute/issues/`.

1. **Docs** (`contribute/03`): the words, ADR 0003, the rule changes, once the owner approves them.
2. **Database** (01): status, drafts, takedowns, editor names, approved-only reads. After `contribute/05` and `contribute/06`.
3. **The publish** (02): approved only, takedowns against the guard, the no-contributor-data check.
4. **The published map's reader** moves where the studio may import it (03).
5. **The switch** (04), **drafts** (05), **review** (06), **the Public map** (07).
6. **The Contributors map** (08) and its actions (09), once there are real contributions.

## Open for the owner

- **The default map:** the Playground (recommended), though the switch reads Contributors first.
- **A stale draft:** any editor may discard another's after 7 days without a change (recommended).
- **Where drafts live, and Take down against the guard:** `../contribute/database.md`, §12.
- **Where the published map's reader goes** so the studio's Public map can use it: `../contribute/rule-changes.md`. The old plan's "moves to `shared/`" can't work, because the reader imports `features/routes`.

## Waiting on

The owner's approval of `../contribute/database.md` and `../contribute/rule-changes.md`. The Contributors map needs real contributions to be useful, which is why it comes last.
