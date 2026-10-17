# 01: The field-test page

Status: claimed
Type: task
Wave: 1
Who: Sonnet, another session, from 2026-10-17. Branch `claude/contribute-field-test`, a draft PR into `staging` titled "Contribute: a field-test page that records a ride on the phone". Not in that night's release: the owner tries it first.
Blocked by: none

## What to build

A bare `/contribute/` page that records a ride on the phone. No database, no design, nothing sent anywhere. Its job is to prove the phone's browser records a ride well enough, and to show how often the location stops (the screen off, a call, another app in front).

**Screens,** plain HTML with Tailwind utilities for layout only (the owner's Figma comes later, ticket 12):

- **Ready:** Start. A list of saved recordings, each downloadable and deletable.
- **Recording:** Stop. Live distance (km, 2 decimals), minutes moving, minutes standing, the hinto count, the gap count.
- **Stopped:** Save, Resume, Cancel.
  - The totals, and the list of hintos (time, minutes).
  - Four optional fields, each with a visible label: start point name, end point name, description (a textarea), and "What did you ride?" (Jeep, Bus, Train, Ferry, Tricycle, Other).
  - Cancel asks once, on the page (no `confirm()`), then deletes the recording.
  - The total minutes lost to gaps.
- **Saved:** the recording is kept on the phone. Download saves it as JSON.

**Recording:**

- `navigator.geolocation.watchPosition` with high accuracy. Every fix is written to IndexedDB at once, one record per fix, keyed by recording id and sequence, so closing the tab loses nothing.
- On reopening with an unfinished recording, it offers Resume or Stop.
- Ids are made on the phone with `crypto.randomUUID`. The saved format has a version number.
- The screen is kept awake with the Screen Wake Lock API, asked for again on `visibilitychange`; a refusal is tolerated.

**The gap log,** the field test's whole point: a gap is recorded when the page is hidden, when no fix arrives for over 5 seconds, and on resuming after a reload.

**The rules,** as pure functions in `src/features/routes/model/ride-recording.ts` (no React, no browser APIs), since the studio will need the same ones:

- distance (haversine);
- jumps dropped: a fix implying over 120 km/h, or with accuracy worse than 50 m, is ignored;
- a hinto is 8 seconds or more within 25 m;
- gaps, as above;
- minutes moving and minutes standing.

**Not in it:** no button on the public map (the owner's 2b, link-only test period), nothing in the studio, no database, no new dependency.

## Files it owns

- `src/app/contribute/` (`main.tsx`, `contribute-app.tsx`), `contribute/index.html`
- `src/features/contribute/`, with an `index.ts` as its public API
- `src/features/routes/model/ride-recording.ts` and `tests/unit/ride-recording-test.mjs`
- For this PR only, the build wiring:
  - `vite.config.ts`: the page as a third input; the public worker's `navigateFallbackDenylist` gains `/contribute`; the manifest kept off the page if the studio's pattern makes that easy
  - `eslint.config.js`: contribute may import routes and shared, never studio, locator or published-map; nothing imports contribute but `app/contribute`
  - `scripts/checks/check-build.mjs`: the public page loads no contribute code; the contribute page loads no studio code and no Supabase client
  - `docs/architecture.md`, regenerated

## Acceptance checks

- `npm run check` passes; `gate-test` and `pwa-test` pass (the worker changed).
- `check-build.mjs` proves both new things, each with a positive control, as its other checks have.
- The public page's chunks are byte-identical except hashes; the PR quotes the shared figure before and after.
- Every effect that subscribes cleans up (`watchPosition`, the wake lock, `visibilitychange`).
- Every input has a visible label; focus is visible.
- On a phone: open `/contribute/` on the PR's preview, Start, ride, Stop, Save, Download, and the JSON holds the points, the hintos and the gaps.

## Comments
