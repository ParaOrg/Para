# Plans

Four projects for now and one for later, planned with the owner on 2026-10-15. **Planning only: nothing here is built.** The execution plan (tickets, pull requests, who does what) comes once the owner has added the rest.

| # | Project | Spec | In one line | Waiting on |
| --- | --- | --- | --- | --- |
| 1 | Small fixes | [small-fixes/spec.md](small-fixes/spec.md) | The trip card's "Distance" tile; SWITCH keeps the picked hintuan; the card takes its Figma name, TimelineRouteDetailCard | Nothing |
| 2 | Commuter rename | [commuter-rename/spec.md](commuter-rename/spec.md) | "Visitor" becomes "commuter", in the docs and then the code | Nothing |
| 3 | Driver app | [driver-app/spec.md](driver-app/spec.md) | `/driver/`: drivers record each ikot offline, and it uploads by itself | The owner's design of the driver screens; the field test |
| 4 | Studio maps | [studio-maps/spec.md](studio-maps/spec.md) | Drafts \| Tracking \| Public, and Draft → Pending → Approved | Nothing (Tracking needs driver data to be useful) |
| Later | Train tracking | [train-tracking/spec.md](train-tracking/spec.md) | "My train ride" (stations left, an alert before yours) and trains estimated from the timetable | The owner deciding when; timetables |

## Order

1 → 2 → 3 → 4.

- **1 first:** small, visible, independent.
- **2 before 3 and 4:** the new docs are then written with "commuter" from the start.
- **3 before 4:** drivers start collecting data while the studio maps are built. The Tracking map comes last in 4, once there is data to show.
- **Train tracking** is for the future, outside this order.

## What these change in the existing docs

- **`CONTEXT.md`:** new and changed words, listed in each spec's "Words" section.
- **ADR 0001** (visitors read a published file): an amendment for "visitor" → "commuter" (project 2). Its consequence "a change the editor saves is seen when it is published" is replaced: commuters see what was approved, then published (project 4, new ADR). The decision itself stands: commuters read static files, never the database.
- **New ADR** (project 3): drivers send their location; commuters never do.
- **`.claude/CLAUDE.md`:**
  - `driver` joins `locator`, `published-map` and `studio` as a leaf feature: it may import `routes`, never the others, and the public page never loads it.
  - The driver feature calls one database function (the upload). Today only `features/studio/data/` may reach Supabase.
  - The studio's Public map reads the published files, whose reader lives in `features/published-map`. It moves to `shared/`.

## Adding to the plan

A new idea gets its own folder (`.scratch/<project>/spec.md`), or a section in the spec it belongs to.
