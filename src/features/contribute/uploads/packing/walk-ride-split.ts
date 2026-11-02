import {
  distanceM,
  hintosOf,
  keptFixes,
  rideSpans,
  type Fix,
  type Gap,
  type ModeSwitch,
} from '@/features/routes/model/ride-recording';

/** A recording's distance and time, split into walked (Lakad) and ridden (Sakay). */
export interface WalkRideSplit {
  walkM: number;
  rideM: number;
  walkSeconds: number;
  rideSeconds: number;
}

/** Milliseconds of `from`–`to` inside the gaps, which must already be merged. */
function overlapMs(from: number, to: number, gaps: readonly Gap[]): number {
  return gaps.reduce(
    (sum, gap) => sum + Math.max(0, Math.min(to, gap.to) - Math.max(from, gap.from)),
    0,
  );
}

/**
 * How much of a recording was walked and how much ridden, by the same rules as
 * its totals (summarize in ride-recording.ts), so walk and ride add up to them:
 * - distance: each leg pathLengthM counts goes to the mode the recording was on
 *   as the leg arrived, the way modesOf draws it, so walkM + rideM is the
 *   summary's distanceM;
 * - time: the span in each mode less the `blocked` time (the summary's gaps and
 *   the pauses, merged), so walkSeconds + rideSeconds is its moving plus
 *   standing seconds.
 * No switches is all ride, as everywhere else. Unrounded: the upload rounds.
 */
export function walkRideSplit(
  fixes: readonly Fix[],
  blocked: readonly Gap[],
  from: number,
  now: number,
  modes: readonly ModeSwitch[],
): WalkRideSplit {
  const ride = rideSpans(modes, from, now);
  // A switch takes effect at its own millisecond; fix times are whole milliseconds.
  const isRideAt = (time: number): boolean => {
    const clamped = Math.min(Math.max(time, from), now - 1);
    return ride.some((span) => clamped >= span.from && clamped < span.to);
  };

  const kept = keptFixes(fixes);
  const hintos = hintosOf(kept);
  const inside = (fix: Fix) => hintos.find((h) => fix.time >= h.from && fix.time <= h.to);
  let walkM = 0;
  let rideM = 0;
  for (let i = 1; i < kept.length; i++) {
    const was = inside(kept[i - 1]);
    if (was && was === inside(kept[i])) continue;
    const metres = distanceM(kept[i - 1].at, kept[i].at);
    if (isRideAt(kept[i].time - 1)) rideM += metres;
    else walkM += metres;
  }

  const rideMs = ride.reduce(
    (sum, span) => sum + (span.to - span.from) - overlapMs(span.from, span.to, blocked),
    0,
  );
  const activeMs = Math.max(0, now - from) - overlapMs(from, now, blocked);
  return {
    walkM,
    rideM,
    walkSeconds: Math.max(0, activeMs - rideMs) / 1000,
    rideSeconds: rideMs / 1000,
  };
}
