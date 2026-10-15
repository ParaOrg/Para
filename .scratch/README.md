# Plans

Five projects for now and one for later, planned with the owner on 2026-10-15. **Planning only: nothing here is built.** The execution plan (tickets, pull requests, who does what) comes once the owner has added the rest.

| # | Project | Spec | In one line | Waiting on |
| --- | --- | --- | --- | --- |
| 1 | Small fixes | [small-fixes/spec.md](small-fixes/spec.md) | The trip card's "Distance" tile; SWITCH keeps the picked hintuan; the card and its timeline take their Figma names; trains say Northbound / Southbound | Nothing |
| 2 | Ride start and end | [ride-start-and-end/spec.md](ride-start-and-end/spec.md) | On the trip's timeline, any hintuan or station can be the ride's start, not only its end | The owner's rule for the rail outside the ride (TimelineStick) |
| 3 | Commuter rename | [commuter-rename/spec.md](commuter-rename/spec.md) | "Visitor" becomes "commuter", in the docs and then the code | Nothing |
| 4 | Driver app | [driver-app/spec.md](driver-app/spec.md) | `/driver/`: drivers record each ikot offline, and it uploads by itself | The owner's design of the driver screens; the field test |
| 5 | Studio maps | [studio-maps/spec.md](studio-maps/spec.md) | Drafts \| Tracking \| Public, and Draft → Pending → Approved | Nothing (Tracking needs driver data to be useful) |
| Later | Train tracking | [train-tracking/spec.md](train-tracking/spec.md) | "My train ride" (stations left, an alert before yours) and trains estimated from the timetable | The owner deciding when; timetables |

## Order

1 → 2 → 3 → 4 → 5.

- **1 first:** small, visible, independent.
- **2 after 1:** it builds on 1's SWITCH rule and lands in 1's renamed files.
- **3 before 4 and 5:** the new docs are then written with "commuter" from the start.
- **4 before 5:** drivers start collecting data while the studio maps are built. The Tracking map comes last in 5, once there is data to show.
- **Train tracking** is for the future, outside this order.

## What these change in the existing docs

- **`CONTEXT.md`:** new and changed words, listed in each spec's "Words" section.
- **ADR 0001** (visitors read a published file): an amendment for "visitor" → "commuter" (project 3). Its consequence "a change the editor saves is seen when it is published" is replaced: commuters see what was approved, then published (project 5, new ADR). The decision itself stands: commuters read static files, never the database.
- **New ADR** (project 4): drivers send their location; commuters never do.
- **`.claude/CLAUDE.md`:**
  - `driver` joins `locator`, `published-map` and `studio` as a leaf feature: it may import `routes`, never the others, and the public page never loads it.
  - The driver feature calls one database function (the upload). Today only `features/studio/data/` may reach Supabase.
  - The studio's Public map reads the published files, whose reader lives in `features/published-map`. It moves to `shared/`.

## Adding to the plan

A new idea gets its own folder (`.scratch/<project>/spec.md`), or a section in the spec it belongs to.
