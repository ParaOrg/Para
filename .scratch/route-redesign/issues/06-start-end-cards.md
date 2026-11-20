# 06: Start and End cards, with the swap

Status: resolved
Resolved by: [#1090](https://github.com/ParaOrg/Para/pull/1090)
Type: task
Blocked by: 01

## What to build

- **Two cards.** `TripEndsCard` keeps its file and name, and draws a Start card and an End card. It takes an optional `via`, which the shell passes once issue 03 lands.
- **The swap** sits between them, and the via line under End.
- **A loop** shows one card, with no swap.

## Done when

- Stories cover a two-way trip, a loop, a long name, and the swap pressed.
- The suites' `trip-*` ids stay.
