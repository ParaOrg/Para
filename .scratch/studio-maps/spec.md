# Studio maps: Drafts, Tracking, Public

## What it is

The studio gets **three maps behind one switch** at the top:

- **Drafts:** where editors draw and change routes and hintuans.
- **Tracking:** the drivers' ikots and hintos (see `driver-app`).
- **Public:** what commuters see.

Every route and hintuan goes **Draft → Pending → Approved**, and only approved work reaches commuters, at that night's publish.

**Why:** since 0015 (2026-10-14) three editors draw and change every route. Without a review step, every experiment reaches commuters at the next nightly publish.

**ADR 0001.** This replaces its consequence "A change the editor saves is seen by visitors when it is published": a change is now seen once it is approved, then published. That's a new ADR. ADR 0001's decision itself stands: commuters read static files, never the database.

## Words (for `CONTEXT.md`)

- **Draft:** a route or hintuan being drawn or changed. Only editors see it.
- **Pending:** a draft submitted for review.
- **Approved:** what commuters get at the next publish.
- **Drafts map / Tracking map:** two of the studio's three maps. The third, Public, shows the public map as commuters see it.
- **Editor:** update the entry. It says "Today the owner alone"; since 2026-10-14 it's the owner and two editors.
- _Avoid_: **staging**. That's the owner's staging site, the `staging` branch's preview (`wrangler.jsonc`). Also avoid **push**, which was replaced by Approve.

## The switch

- **Always on screen at the top: Drafts | Tracking | Public.** Each choice has a word and an icon, not colour alone. Never in a menu: an editor must always see which map they're on.
- **Not "Change map":** the round button at the top right (`basemap-control.tsx`) changes how the map *looks*. This switch changes what it *shows*.
- **The address remembers the choice:** `/studio/?map=drafts`, `tracking` or `public`. It can't be `/studio/tracking`: the host answers any unknown address with the public map's page (`wrangler.jsonc`).
- **Switching keeps the camera** (the same place and zoom) and the basemap. A half-drawn line survives.
- **Drafts opens by default.**

## Draft → Pending → Approved

For routes and hintuans alike.

| Status | Who acts | Buttons |
| --- | --- | --- |
| **Draft** | The editor drawing it | **Submit** |
| **Pending** | Any editor, the one who drew it included | **Approve** · **Send back** (with a note; it returns to Draft) |
| **Approved** | Reaches commuters at that night's publish | **Take down** |

**Rules:**

- **Any editor can approve, their own work included** (the owner's call, 2026-10-15). Pending still marks work as finished and ready, apart from drafts in progress.
- **Editing an approved route or hintuan starts a new draft.** Commuters keep the approved version until the new one is approved.
- **A route can't be approved without its two end places.** Approving a route offers to approve its pending hintuans too.
- **A hintuan can be approved alone.** Public routes that pass it gain it on their timelines.
- **Take down** removes an approved route or hintuan from the public map at the next publish.
- **On the day this ships, everything already in the database is marked Approved,** so commuters see no change.

## The three maps

**Drafts:**

- Today's studio tools.
- Draft and pending items are marked.
- A **review list** of everything pending: who drew it (each row already records its maker, 0015), with the approved version beside the new one. **Approve** or **Send back**.

**Public:**

- The published map, read the same way commuters read them: exactly what commuters see. Read-only.
- **Take down.**
- A **"waiting for tonight's publish" list** of what was approved since the last publish. Without it, the map looks unchanged after an approval and it seems to have failed.

**Tracking:**

- Every uploaded ikot, as faint lines (the cleaned copies).
- Filters: date, driver, route, papunta or pabalik.
- **Hintos** as circles sized by their minutes, each marked "inside hintuan X" or "no hotspot here". Tap one for **Draw a hintuan here**, which switches to Drafts with the box started.
- **Use this line:** a biyahe's cleaned line becomes a draft direction line in one tap. This is what turns ground truth into routes.
- **Auto-verify** (below).
- Otherwise read-only.

## Confidence: verified by drivers

Every direction has carried `confidence`, either **drawn** or **verified**, since `0001_init.sql`: "Nothing is 'verified' until it has been ridden with a GPS trace." Drivers' ikots are that trace. A direction becomes **verified** when enough biyahe match its line; how many, and how close, is decided with real data.

**Status and confidence stay separate:**

- **Status** says whether it's ready for commuters. Editors decide it.
- **Confidence** says whether a jeep has driven it. The data decides it.

A route can be approved but only drawn. **Later:** a "Verified by drivers" badge on the public map.

## The publish

- The nightly publish (`scripts/publish/publish-map.mjs`) reads **approved versions only**.
- Its guard refuses a file that lost more than 30% of a table's rows (ADR 0001). Taking down routes on purpose must not trip it; how is decided while building.
- No tracking data in the published map (see `driver-app`, Privacy).
- **Undoing a publish:** git keeps every published version.

## The hard part

Keeping an approved version apart from a draft of the same route or hintuan needs a database design for versions. It's decided in the database step, before any screen.

## Build order

1. **Docs.** The words, and the new ADR.
2. **Database.** Versions and status, and the database rules: any editor approves, their own work included.
3. **Drafts and Public.** The switch with these two choices; Submit, Approve, Send back, Take down; the review list; the waiting list; the publish reading approved versions only.
4. **Tracking joins the switch.** Lines and filters, hintos, Draw a hintuan here, Use this line, auto-verify. It needs driver data (`driver-app`).

## Waiting on

Nothing. The Tracking map needs driver data to be useful, which is why it comes last.
