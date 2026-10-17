import type { LngLat } from '@/shared/utils/geo';

/*
 * The rules for a ride recorded on a phone: which fixes count, how far the
 * ride went, where it stood, and how much time the phone lost. Pure, with no
 * React and no browser API, so the contribute page and the studio apply the
 * same rules and a unit test can pin them.
 *
 * Nothing here imports shared/utils/geo at run time (only its LngLat type):
 * that module sits in the build's shared chunk, which carries MapLibre, and a
 * contributor's phone should not download a map to record a ride. The distance
 * below is geo.ts's haversine written out again, and a unit test holds the two
 * together.
 */

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in metres between two [lng, lat] points. */
export function distanceM([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** One location fix as the phone reported it. */
export interface Fix {
  /** When the phone took the fix, in milliseconds since the epoch. */
  time: number;
  at: LngLat;
  /** The phone's own estimate of the error, in metres. */
  accuracyM: number;
}

/** Why a stretch of time has no fixes. */
export type GapReason = 'hidden' | 'silent' | 'resumed';

/** A stretch of time the phone did not record, in milliseconds since the epoch. */
export interface Gap {
  from: number;
  to: number;
  /** Every reason that fell in this stretch, once merged. */
  reasons: readonly GapReason[];
}

/** Standing in one place: a hinto, the owner's word for a stop made during the ride. */
export interface Hinto {
  from: number;
  to: number;
  at: LngLat;
}

/** A fix implying more than this speed is a jump in the phone's position, not a vehicle. */
export const MAX_SPEED_KMH = 120;
/** A fix less certain than this is too vague to place the ride. */
export const MAX_ACCURACY_M = 50;
/** Standing this long within HINTO_RADIUS_M of where it began is a hinto. */
export const HINTO_MIN_SECONDS = 8;
export const HINTO_RADIUS_M = 25;
/** No fix for longer than this is a gap: the phone normally reports about once a second. */
export const SILENCE_SECONDS = 5;

/**
 * The fixes that count: each is accurate enough, and implies no more than
 * MAX_SPEED_KMH from the last one that counted. A fix that is ignored does not
 * become the point the next is measured from.
 */
export function keptFixes(fixes: readonly Fix[]): Fix[] {
  const kept: Fix[] = [];
  for (const fix of fixes) {
    if (fix.accuracyM > MAX_ACCURACY_M) continue;
    const last = kept[kept.length - 1];
    if (last) {
      const seconds = (fix.time - last.time) / 1000;
      if (seconds <= 0) continue;
      const kmh = (distanceM(last.at, fix.at) / seconds) * 3.6;
      if (kmh > MAX_SPEED_KMH) continue;
    }
    kept.push(fix);
  }
  return kept;
}

/** The length of the path through these fixes, in metres. Across a gap the straight line counts. */
export function pathLengthM(fixes: readonly Fix[]): number {
  let total = 0;
  for (let i = 1; i < fixes.length; i++) total += distanceM(fixes[i - 1].at, fixes[i].at);
  return total;
}

/**
 * Where the ride stood: each run of fixes that stays within HINTO_RADIUS_M of
 * the run's first fix and lasts HINTO_MIN_SECONDS or more. Expects fixes that
 * count (keptFixes), in time order.
 */
export function hintosOf(fixes: readonly Fix[]): Hinto[] {
  const hintos: Hinto[] = [];
  let start = 0;
  const close = (end: number) => {
    const first = fixes[start];
    const last = fixes[end];
    if (end > start && (last.time - first.time) / 1000 >= HINTO_MIN_SECONDS) {
      hintos.push({ from: first.time, to: last.time, at: first.at });
    }
  };
  for (let i = 1; i < fixes.length; i++) {
    if (distanceM(fixes[start].at, fixes[i].at) > HINTO_RADIUS_M) {
      close(i - 1);
      start = i;
    }
  }
  if (fixes.length > 0) close(fixes.length - 1);
  return hintos;
}

/**
 * Stretches with no fixes: between two fixes more than SILENCE_SECONDS apart,
 * and from the last fix to `now` when that is also longer than that. `now` is
 * the end of the recording, or the present while it runs. Every fix the phone
 * reported counts here, kept or not: the phone was answering. The wait for
 * the first fix is not a gap.
 */
export function silentGaps(fixes: readonly Fix[], now: number): Gap[] {
  const gaps: Gap[] = [];
  const silent = (from: number, to: number) => {
    if ((to - from) / 1000 > SILENCE_SECONDS) gaps.push({ from, to, reasons: ['silent'] });
  };
  for (let i = 1; i < fixes.length; i++) silent(fixes[i - 1].time, fixes[i].time);
  const last = fixes[fixes.length - 1];
  if (last) silent(last.time, now);
  return gaps;
}

/** Overlapping or touching gaps joined into one, in time order, with all their reasons. */
export function mergeGaps(gaps: readonly Gap[]): Gap[] {
  const sorted = [...gaps].sort((a, b) => a.from - b.from);
  const merged: Gap[] = [];
  for (const gap of sorted) {
    const last = merged[merged.length - 1];
    if (last && gap.from <= last.to) {
      merged[merged.length - 1] = {
        from: last.from,
        to: Math.max(last.to, gap.to),
        reasons: [...new Set([...last.reasons, ...gap.reasons])],
      };
    } else {
      merged.push({ ...gap, reasons: [...gap.reasons] });
    }
  }
  return merged;
}

/** Seconds of `from`–`to` that fall inside the gaps, which must already be merged. */
function overlapSeconds(from: number, to: number, gaps: readonly Gap[]): number {
  let ms = 0;
  for (const gap of gaps) ms += Math.max(0, Math.min(to, gap.to) - Math.max(from, gap.from));
  return ms / 1000;
}

/** What a recording came to. */
export interface RideSummary {
  /** Fixes the phone reported, and how many of them count. */
  fixCount: number;
  keptCount: number;
  distanceM: number;
  movingSeconds: number;
  standingSeconds: number;
  /** Time the phone did not record: the merged gaps, clipped to the recording. */
  lostSeconds: number;
  hintos: Hinto[];
  gaps: Gap[];
}

/**
 * The totals of a recording. `logged` are the gaps the page saw happen (hidden,
 * resumed after a reload); the silent ones are found from the fixes. Standing
 * is the hintos' time that was not lost, and moving is what is left of the
 * recorded span once standing and lost time are taken out.
 */
export function summarize(
  fixes: readonly Fix[],
  logged: readonly Gap[],
  from: number,
  now: number,
): RideSummary {
  const kept = keptFixes(fixes);
  const gaps = mergeGaps([...logged, ...silentGaps(fixes, now)])
    .map((g) => ({ ...g, from: Math.max(g.from, from), to: Math.min(g.to, now) }))
    .filter((g) => g.to > g.from);
  const hintos = hintosOf(kept);
  const standingSeconds = hintos.reduce(
    (sum, h) => sum + (h.to - h.from) / 1000 - overlapSeconds(h.from, h.to, gaps),
    0,
  );
  const lostSeconds = gaps.reduce((sum, g) => sum + (g.to - g.from) / 1000, 0);
  const spanSeconds = Math.max(0, (now - from) / 1000);
  return {
    fixCount: fixes.length,
    keptCount: kept.length,
    distanceM: pathLengthM(kept),
    movingSeconds: Math.max(0, spanSeconds - lostSeconds - standingSeconds),
    standingSeconds,
    lostSeconds,
    hintos,
    gaps,
  };
}
