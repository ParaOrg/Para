# 17: Travel times from contributor rides (later)

Status: needs-triage
Type: task

## What it is

- **Not now.** This is a later idea, kept here so it isn't lost (README, decision 3).
- **The idea:** the estimate from issue 14 is replaced, where there are enough rides, by real times measured from contributors' recorded rides.

## Questions before it is built

- How many rides make a time trustworthy, and how old may they be?
- How are the times published, given that commuters read only the published map (ADR 0001)?
- How does it keep a contributor's rides from being traced back to them?

## Plan (draft, for the owner)

A first answer to the questions above. Nothing is built until the owner OKs it and this ticket is triaged. Every fact below was read from `staging`; the file it comes from is named.

### What the rides already hold

- **A time on every point.** `point_batch` stores each point's time as milliseconds after the one before (`dt_ms`), about one point a second (`supabase/migrations/20261019125900_contributions.sql`).
- **The ride's own parts.** The `events` record each switch between walking (Lakad) and riding (Sakay). `ride_s` and `ride_m` hold their totals (`20261031090000_account_stats.sql`). So the riding can be timed apart from the walk to the stop.
- **The vehicle,** when the contributor gave it: jeep, e-jeep, bus, UV Express, train, ferry, tricycle or other. Train is one value, with no LRT-1, LRT-2 or MRT-3.
- **Which direction a ride helped draw.** `contribution_use` (kind `direction`) links a ride to the `route_variant` an editor drew from it (`20261022090000_contribution_use.sql`). It doesn't say which stretch of the direction the ride covered.
- **What it doesn't hold:** no time per stop, no wait at the stop, and no link between a ride and a direction it was never used to draw.
- **What retirement leaves.** After 24 months the points are dropped (`private.retire_month`), and with them the time on each point. Only the start, the end and the totals stay. So a ride can be timed stretch by stretch only in its first 24 months.

### A first estimate, in two steps

1. **Measured speeds per mode, replacing the guesses.** From every riding part of every ride under 24 months old, work out moving speed and stop time per mode. They replace the numbers in `src/features/routes/model/travel-speeds.ts`, as ranges: the slow and fast ends as two percentiles, for example the 20th and 80th. The formula in `travel-time.ts` stays as it is.
   - Nothing about any one route is published. That makes this the smallest privacy step.
   - Train stays the guessed numbers until rides say which line they were on.
2. **Times per direction, where there are enough rides.**
   - **Matching:** match each ride's riding part onto a published direction's line, with the ride's first and last 200 m left out, as retirement already cuts them. Time the stretch they share. The studio's snapping code may serve.
   - **Combining:** combine those stretches into minutes per km for that direction, and show its range on the pill in the same 5-minute steps.
   - **Fallback:** a direction without enough rides keeps the step-1 estimate.

### How it is published (ADR 0001, ADR 0003, ADR 0004)

- **The publish can't read rides, and should stay that way.** ADR 0004 says anonymous readers, the nightly publish among them, read nothing about contributions, and `scripts/publish/privacy-probe.mjs` proves it on every run.
- **Proposed:** an editor works out the figures in the studio, reviews them and saves them, the way a direction is approved today (ADR 0003):
  - Step 1's speeds become a reviewed change to `travel-speeds.ts`.
  - Step 2's times are saved on the direction (for example, low and high minutes on `route_variant`).
  - The publish carries the saved times into the line files like any other approved field. Commuters still read only the published files (ADR 0001).
- **What it avoids:** a new database reader, and any change to the probe.

### Keeping a ride from being traced back

- **Only aggregates, coarsened.** No single ride's time is ever published. A direction's time is shown only when there are at least 5 rides from at least 3 different contributors. Every figure is rounded out to 5-minute steps, as today.
- **Retired rides count separately.** A retired ride has lost its contributor link. All retired rides count together as one contributor, so the "3 different contributors" rule can't be met through them alone.
- **No time of day for now.** No date or time of day is published: one range covers the whole day. Ranges by time of day (rush hour against the rest) would say more about when people ride, so they wait for the owner.
- **Recent rides only.** Only rides from the last 12 months count, so a time reflects today's roads.
- **Nothing new is kept.** The studio reads only the points it already reads. The editor sees and saves totals, never which contributor rode which stretch.

### For the owner to decide

1. **Consent.** Does the consent ("studying how people ride", and "Never the public" for the rides themselves) cover publishing a combined time per route? Or does it need a new consent version and an ADR?
2. **The thresholds:** 5 rides, 3 contributors, 12 months and the 20th–80th percentiles. These are proposals to change.
3. **Wording.** Does the pill say when a time is measured rather than estimated, for example "~25–40 min, from riders"?
4. **Trains.** Should the contributor page ask which train line a ride was on, so trains can be measured too?
