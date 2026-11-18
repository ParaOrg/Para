import type { Fix, Mode } from '@/features/routes/model/ride-recording';
import { haversine } from '@/shared/utils/geo';

/**
 * When a recording on Lakad has been moving faster than walking for long enough that the
 * contributor is plainly riding: about 15 km/h for a minute (the owner, Q182). Walking, even
 * briskly, covers some 100 m in a minute; 15 km/h is 250 m.
 */
export const SAKAY_HINT = {
  /** The speed, over the whole stretch, above which it is not walking. */
  speedKmh: 15,
  /** How long the stretch must last. */
  forMs: 60_000,
  /** The longest wait between two fixes inside a stretch: past it, the stretch is not trusted. */
  maxFixGapMs: 20_000,
} as const;

export interface SakayHintInput {
  /** The recording's accepted fixes, oldest first. */
  fixes: readonly Fix[];
  /** The mode the recording is on now. */
  mode: Mode;
  /** When the recording last switched to `mode`: a stretch never reaches back past it. */
  modeSince: number;
  /** When "Switch to Sakay?" was last offered on this recording, or null. */
  askedAt: number | null;
}

/**
 * Whether the recording should now offer "Switch to Sakay?": it is on Lakad, and the last
 * SAKAY_HINT.forMs, since the switch to Lakad, moved faster than walking. Once offered and
 * ignored, it is not offered again until a slower minute has ended the stretch and a new one has
 * built up. Pure: it suggests, it never switches.
 *
 * The speed is the straight line from the stretch's first fix to its last, over the time between.
 * A walker's fixes wander a few metres either way, which a path's length would add up into speed;
 * the straight line only grows when the phone truly goes somewhere.
 */
export function isSakayHintDue({ fixes, mode, modeSince, askedAt }: SakayHintInput): boolean {
  if (mode !== 'walk') return false;
  const ends = fixes.length - 1;
  if (ends < 0 || !isFastUpTo(fixes, ends, modeSince)) return false;
  if (askedAt === null) return true;
  // Offered already: due again only if, since then, some minute was not fast.
  for (let end = ends; end >= 0 && fixes[end].time > askedAt; end -= 1) {
    if (!isFastUpTo(fixes, end, modeSince)) return true;
  }
  return false;
}

/** Whether the SAKAY_HINT.forMs up to fixes[end], all after `since`, moved faster than walking. */
function isFastUpTo(fixes: readonly Fix[], end: number, since: number): boolean {
  const last = fixes[end];
  let start = end;
  while (start > 0 && last.time - fixes[start].time < SAKAY_HINT.forMs) {
    if (fixes[start].time - fixes[start - 1].time > SAKAY_HINT.maxFixGapMs) return false;
    start -= 1;
  }
  const first = fixes[start];
  const spanMs = last.time - first.time;
  if (first.time < since || spanMs < SAKAY_HINT.forMs) return false;
  const kmh = haversine(first.at, last.at) / 1000 / (spanMs / 3_600_000);
  return kmh >= SAKAY_HINT.speedKmh;
}
