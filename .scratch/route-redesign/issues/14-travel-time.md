# 14: The travel-time estimate

Status: resolved
Resolved by: [#1103](https://github.com/ParaOrg/Para/pull/1103)
Type: task
Blocked by: 08

## What to build

- **Para's own estimate** (README, decision 3): the route's length over a typical speed range for its mode, plus a small dwell per stop. That gives a range, written for example "~30–60 min" and labelled an estimate. Google is not used.
- **One constants file** holds the speed range per mode and the dwell per stop. The pull request lists every number for the owner to confirm before it merges.
- **A pure function** works out the range from a route's length, its mode and its stops, with no React and no MapLibre, under `src/features/routes/model/`.
- **The time pill** (issue 08) shows it.

## Done when

- Unit tests cover each mode, a short and a long route, a route with many stops, and the rounding of the range.
- The pill's words say it is an estimate, for a screen reader too.
