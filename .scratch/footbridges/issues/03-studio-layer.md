# 03: Footbridges in the studio

Status: needs-triage (after 01; the owner's answer to question 9)
Type: task
Blocked by: 01

## What to build

- **What.** The same footbridge file on the studio's maps (the workshop and the Contributors map), read-only, as a reference for editors placing hintuans and drawing routes.
- **How it's switched.** A toggle with the studio's other map layers, off by default (question 9).
- **What it doesn't do.** It marks nothing, saves nothing and changes no draft.
- **The look.** On `../README.md`'s "Owner to design later" list.

## Acceptance checks

- A story with the toggle off and on.
- A studio suite check: the toggle draws the layer and drawing a route still works with it on (the drawing suites click the map: keep their click points clear, as `regression-gestures` learned with the search bar).
- A ds-reviewer PASS; `npm run check`; CI green, the drawing suites included on the staging push; merged into staging.
