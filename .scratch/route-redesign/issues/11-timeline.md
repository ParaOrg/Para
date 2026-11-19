# 11: The timeline

Status: ready-for-agent
Type: task
Blocked by: 01

## What to build

- **The rail:** flat, in the route's colour.
- **The pills:** a green Start pill, and a red End pill with an E icon.
- **Tapping a stop still picks it.** Folding goes.
- **The place names** are the same as at the top.
- **Walk and line notes** go under the timeline.
- **The split.** `timeline-route-detail-card.tsx` (204 lines) is split, so that no file is over 150.

## Done when

- Stories cover a short trip, a long one, rail with station codes, and a picked stop.
- The suites that pick stops pass.
