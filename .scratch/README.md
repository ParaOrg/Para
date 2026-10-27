# Plans

Five projects for now and one for later, planned with the owner on 2026-10-15; project 4 became contributors on 2026-10-17. Projects 1 and 2 are built (2026-10-16, their specs say where); the rest are plans only. Projects 4 and 5 have their tickets (2026-10-17), in `contribute/issues/` and `studio-maps/issues/`.

| # | Project | Spec | In one line | Waiting on |
| --- | --- | --- | --- | --- |
| 1 | Small fixes (done) | [small-fixes/spec.md](small-fixes/spec.md) | The trip card's "Distance" tile; Papunta / Pabalik keeps a jeep's picked hintuan; the card and its timeline take their Figma names; trains say Northbound / Southbound | Nothing |
| 2 | Ride start and end (done) | [ride-start-and-end/spec.md](ride-start-and-end/spec.md) | On the trip's timeline, any hintuan or station can be the ride's start, not only its end | Nothing |
| 3 | Commuter rename | [commuter-rename/spec.md](commuter-rename/spec.md) | "Visitor" becomes "commuter", in the docs and then the code | Nothing |
| 4 | Contributors (was the driver app) | [contribute/spec.md](contribute/spec.md) | `/contribute/`: anyone records a ride on their phone, and Save sends it to the studio | The field test; the owner's design of the screens |
| 5 | Studio maps | [studio-maps/spec.md](studio-maps/spec.md) | Contributors \| Playground \| Public, and Draft → Pending → Approved | Contributions, for the Contributors map only |
| Later | Train tracking | [train-tracking/spec.md](train-tracking/spec.md) | "My train ride" (stations left, an alert before yours) and trains estimated from the timetable | The owner deciding when; timetables |

## Order

1 → 2 → 3, then 4 and 5 side by side (the owner's answer 3c, 2026-10-17).

- **1 first:** small, visible, independent.
- **2 after 1:** it builds on 1's SWITCH rule and lands in 1's renamed files.
- **3 before 4 and 5:** the new docs are then written with "commuter" from the start.
- **4 and 5 together:** the contributor page's field test needs no database and no design, while the review step protects the public map now. The Contributors map comes last in 5, once there are contributions to show. The tickets and their waves are in each project's `issues/`.
- **Train tracking** is for the future, outside this order.

## What these change in the existing docs

Approved by the owner on 2026-10-17 and applied from [contribute/rule-changes.md](contribute/rule-changes.md): the new words in `CONTEXT.md`, ADR 0003 (approved, then published), ADR 0004 (a commuter's location leaves the phone only on the contributor page, after consent), an amendment line on ADR 0001, and the `.claude/CLAUDE.md` lines about the fourth leaf feature, Supabase from two features, the types' home, the environment, and where the published map's reader goes.

The database design for both projects, with the audit of every database rule, is [contribute/database.md](contribute/database.md).

## Adding to the plan

A new idea gets its own folder (`.scratch/<project>/spec.md`), or a section in the spec it belongs to.
