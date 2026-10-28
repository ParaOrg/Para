# 09: Recenter button and compass on the contributor map

Status: needs-info (owner: which build, and what was looked for)
Type: investigation
Who: a session
Source: the owner's phone test of the app, 2026-10-26, feedback (d)

The owner got lost on the map and saw no recenter button or compass.

## What I found

The contributor map already has both. Since 2026-10-24 (`1c137961`) the shell hands the page the public map's locator (`ContributorLocation`, `src/app/contribute/contribute-app.tsx`): the same LocatorButton as `/`, at the map's right edge, with the map-style button on top and the Mark button above it while recording. `tests/e2e/contribute-test.mjs` checks it. The button's taps are the public map's:

1. Show where I am (the camera goes to the dot);
2. Follow me, north up (the camera stays with the dot);
3. Turn the map the way I face (the compass; the button's arrow shows it);
4. Back to north up.

So there is no component missing, and I changed no code. What can still be true:

- The tester's app was built before 24 Oct, or a cached copy was shown. The installed version should be checked.
- The compass is the **third state of the same button**, not a separate control. MapLibre's own compass and zoom control is hidden on touch screens by design (on `/` too), so there is no "north" icon until the button's compass look is on.
- With location refused, the button shows a short note for 5 s ("Location is off for this site…") and nothing else.

## Questions for the owner

- Which build was it, and was the button there but not found, or really missing?
- Is the three-state button enough, or does the map need a separate north indicator? That is a design (Figma) question, for `/` as well.

Nothing to build until these are answered: the task asked to build this, but the premise did not hold.
