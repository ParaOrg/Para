# 07: "View N more routes"

Status: ready-for-agent
Type: task
Blocked by: 01, 04

## What to build

- **A disclosure** at the top of the detail, "View N more routes" ("1 more route" for one).
- **What it holds:** today's other-routes data, drawn as destination rows (04).
- **A row opens that trip.**
- **The old part goes.** `trip-other-routes.tsx` is deleted here.

## Done when

- Stories cover none, one, many, and open and closed.
- The disclosure is a real `button` with `aria-expanded`.
