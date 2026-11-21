# 05: RouteCard restyled

Status: resolved
Resolved by: [#1089](https://github.com/ParaOrg/Para/pull/1089)
Type: task
Blocked by: 04

## What to build

`RouteCard`:
- the origin in Bold 28/32;
- the road header shows only an icon, while the `ul` keeps its `aria-label`, so the mode is still said in words;
- the darker fills (new semantics);
- the destination rows from 04;
- no cap on a card's rows.

Rail cards keep their station codes. `route-card.tsx` is 158 lines today and goes under 150.

## Done when

- Stories cover each mode, rail, a long card, and a long name.
- A ds-reviewer pass is clean.
- The suites that use `card-*` and `data-direction` pass unchanged.
