# 03: The model: `to` and `via` apart

Status: resolved
Resolved by: [#1086](https://github.com/ParaOrg/Para/pull/1086)
Type: task
Blocked by: none

## What to build

- **The change.** `departures.ts` (`byPlace` and what calls it) returns a row's `to` (the place it goes to) and its `via` as two fields. Today `directionRowName` (`model/routes.ts`) joins them into one string.
- **Today's callers keep their words.** They join the two the way `directionRowName` does now, until their own redesign issue changes them. `routes-near-here.tsx` is one of them.
- **No React, no MapLibre:** the model rules hold.

## Done when

- A unit check proves it. A direction with a via gives `to` and `via` apart. One without gives `via: null`, or an empty `via`, whichever the code already uses. The joined words match today's for every published direction.
- No page changes what it shows.
