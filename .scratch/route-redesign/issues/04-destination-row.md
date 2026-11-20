# 04: The destination row

Status: resolved
Resolved by: [#1087](https://github.com/ParaOrg/Para/pull/1087)
Type: task
Blocked by: 01, 02, 03

## What to build

- **The restyle.** `RouteEndPointBar` becomes the destination row: a circle-arrow icon, the place in Bold 18/26, and a "via" notes line in Medium 14/20.
- **New semantic tokens only.**
- **Long names wrap.**
- **Taps work as today,** with the same test ids.

## Done when

- Stories cover default, with a via, without one, a long name, and selected.
- A ds-reviewer pass is clean.
- The Storybook plays and the suites that read these rows pass.
