# 12: The shell: docking, wiring, e2e and stories

Status: ready-for-agent
Type: task
Blocked by: 04–11

## What to build

- **Desktop.** The detail docks full height on the left, 393 wide, like the list.
- **Mobile.** It is the sheet.
- **Controls stay.** Today's Controller, back and ✕ (README, decision 4).
- **The wiring.** The new parts are wired into the public map and the studio's Public map. `timeline-route-detail-card.tsx` passes `via` into `TripEndsCard` (issue 06).
- **The split.** `trip-card.tsx` (261 lines) is split, so that no file is over 150.
- **The tests.** The e2e suites and stories are updated. No test is skipped or loosened.

## Done when

- Every suite passes on a pull request run and on staging.
- Every test id the suites read stays.
