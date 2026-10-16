# Train tracking (later)

**Planned 2026-10-15, for the future.** Not built now, and not in the current order (see `.scratch/README.md`).

## What it is

Two features for LRT-1, LRT-2 and MRT-3 riders. Both run on the commuter's own phone.

1. **My train ride.** On a train, the app knows which station you're near and counts the stations left: "3 stations to Cubao", with an alert before your station. It uses the phone's location **on the phone only**, as "Where am I" does today (`features/locator`). Nothing is sent.
2. **Estimated trains.** Trains drawn moving along the line where the timetable puts them, and "next train in about 4 min" at a station. The timetables ship in the published map, so it works offline and costs nothing.

## How others do it (checked 2026-10-15)

| App | Shows | Data from |
| --- | --- | --- |
| Rush PH | Arrival estimates | Commuters' reports of arrivals, delays and cancellations; DOTr said in July 2025 it would integrate it |
| TrainSight | Live and predicted train positions | Tracker hardware on trains, riders' phones sharing location, timetables |
| TRENLigtas | Predicted positions, arrival estimates | Timetables plus community reports |
| ikotMNL | LRT-1 and LRT-2 arrivals, crowding | The operator's own systems (LRMC's official app) |
| TrenKo | Your own ride: the station you're near, stops left | Your phone only |

More in `docs/research/ph-commute-apps-feature-bank.md` (TrainSight, TRENLigtas, ikotMNL; features F19–F23).

**Live positions need a live source:** hardware on trains, the operator's data, or a large crowd of riders' phones. ParaPo has none of these, and commuters sending their location would break ADR 0001. So the two features here are the ones that need neither.

## Rules

- **Nothing leaves the phone** (ADR 0001).
- **Estimated trains are never presented as live.** They're labelled "Estimated from the timetable, not live" and have a look of their own (outlined, say). This is the owner's worry from the parked jeep animation (`PLAN.md`): "the user might think … the jeepney is upcoming".
- **It builds on what's already there:** the three lines and their stations are on the map (`0011_rail.sql`), with their station codes (`src/features/routes/model/rail-codes.ts`).

## Data needed

- Per line: the first and last trains, and the time between trains by time of day and day of the week.
- Travel time between stations.
- Each timetable is dated in the published map, so an old one shows its age.
- **Where from is open:** the operators' published schedules and announcements, or timed by riding. Gathering this is most of the work.

## Limits to remember

- **The alert before your station** needs the app on screen. A web page loses its location when the screen is off (the same limit as `driver-app`). So "My train ride" keeps the screen awake while it's on.
- **Underground**, at an underground station such as LRT-2's Katipunan, or a future subway: GPS fails there. The station count carries on from the timetable's travel times until the phone has a position again.

## Not planned

- **Live positions from a partner** (TrainSight advertises an open API; Rush PH works with DOTr): only if a partner agrees. It would need a small live server and a new ADR.
- **Commuters reporting or sharing their location:** breaks ADR 0001.
- **Our own riders recording trains:** the tracks are fixed and already drawn, and a few riders couldn't cover every train live.
