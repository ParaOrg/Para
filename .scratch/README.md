# Plans

Five projects for now and one for later, planned with the owner on 2026-10-15; project 4 became contributors on 2026-10-17. Projects 1 and 2 are built (2026-10-16, their specs say where); the rest are plans only. Projects 4 and 5 have their tickets (2026-10-17), in `contribute/issues/` and `studio-maps/issues/`.

| # | Project | Spec | In one line | Waiting on |
| --- | --- | --- | --- | --- |
| 1 | Small fixes (done) | [small-fixes/spec.md](small-fixes/spec.md) | The trip card's "Distance" tile; Papunta / Pabalik keeps a jeep's picked hintuan; the card and its timeline take their Figma names; trains say Northbound / Southbound | Nothing |
| 2 | Ride start and end (done) | [ride-start-and-end/spec.md](ride-start-and-end/spec.md) | On the trip's timeline, any hintuan or station can be the ride's start, not only its end | Nothing |
| 3 | Commuter rename | [commuter-rename/spec.md](commuter-rename/spec.md) | "Visitor" becomes "commuter", in the docs and then the code | Nothing |
| 4 | Contributors (was the driver app) | [contribute/spec.md](contribute/spec.md) | `/contribute/`: anyone records a ride on their phone, and Save sends it to the studio | The field test; the owner's design of the screens |
| 5 | Studio maps | [studio-maps/spec.md](studio-maps/spec.md) | Contributors \| Playground \| Public, and Draft → Pending → Approved | Contributions, for the Contributors map only |
| 6 | Own the map tiles | [own-tiles/spec.md](own-tiles/spec.md) | Our own basemap tiles from OpenStreetMap, on R2 behind a Worker, in place of OpenFreeMap | 01 is the spike; the owner: R2, a subdomain, the Worker |
| 7 | para-commute.org | [custom-domain/spec.md](custom-domain/spec.md) | `www.para-commute.org` serves `main` from Cloudflare, `tiles.para-commute.org` turns the tiles cache on, and the old app's phones move over | The owner: the site on Para, Vercel's records, the nameservers |
| 8 | The commuter app in the stores | [commuter-app/spec.md](commuter-app/spec.md) | The commuter side as a React Native (Expo) app on the App Store and Google Play, from the polished web design, aiming for December 2026 | The owner: the web polish first, the store accounts, go for the map spike |
| 9 | A database of its own for staging | [staging-backend/spec.md](staging-backend/spec.md) | Staging talks to a second Supabase project, so testing never touches live data, and migrations are tried there first | The owner: Cloudflare's GitHub access, then go |
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
