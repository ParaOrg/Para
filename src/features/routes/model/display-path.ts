import type { Fix } from './ride-recording';

/*
 * The line drawn on the contributor's map, from the fixes that count. Without
 * mobile data the phone loses assisted GPS, and under a jeep's roof the signal
 * bounces, so fixes that each pass keptFixes still zigzag. This steadies what
 * is DRAWN and nothing else: the stored fixes, the distance, the hintos and
 * the upload all stay on keptFixes' output. Pure and O(n), so it can run again
 * on every fix of a two-hour ride.
 *
 * Four steps, each on the one before's output: draw only the steadier fixes,
 * hold one point while standing, drop a sharp reversal that noise explains,
 * and lightly smooth what is left.
 */

/**
 * Stricter than MAX_ACCURACY_M (50 m): a fix this vague is good enough to
 * count the ride but wanders the line. 30 m is a first guess, to be tuned on a
 * real messy recording.
 */
export const DISPLAY_MAX_ACCURACY_M = 30;
/**
 * Dropping vague fixes must not leave a straight jump this long: past it, the
 * vague fixes in that stretch are drawn after all (a tunnel, an urban canyon).
 */
export const DISPLAY_MAX_GAP_M = 100;
/** Fixes that stay within their own accuracy circle for this long are one stop, drawn as one point. */
export const HOLD_MIN_SECONDS = 5;
/**
 * A hold also needs the fixes within this of the first, whatever the accuracy:
 * at 8 m/s, fixes that report 40 m all sit inside that circle for a few
 * seconds and the vehicle is not standing.
 */
export const HOLD_MAX_RADIUS_M = 10;
/** A turn sharper than this, in degrees (180 is straight back), over a short distance is noise, not a corner. */
export const REVERSAL_MIN_DEG = 150;
/**
 * "Short" for a reversal: both fixes of a leg are within their accuracy of the
 * same truth, so noise alone can put them up to twice that apart. A leg longer
 * than that is a real turn and is kept.
 */
export const REVERSAL_MAX_LEG_ACCURACIES = 2;
/** The smoothing averages each fix with this many neighbours on each side. */
export const SMOOTH_RADIUS = 2;

const METRES_PER_DEGREE = (6_371_000 * Math.PI) / 180;
const REVERSAL_MIN_COS = Math.cos((REVERSAL_MIN_DEG * Math.PI) / 180);

/** A fix on a flat metre grid (east, north) around the first one, so distances are cheap. */
interface Placed {
  fix: Fix;
  x: number;
  y: number;
  /**
   * Never dropped, held or moved: the fix a switch or a mark sits on (so the
   * markers lie on the line), the last fix (so the live line reaches the
   * contributor), and a held stop's point (already an average).
   */
  isPinned: boolean;
}

const gapM = (a: Placed, b: Placed): number => Math.hypot(b.x - a.x, b.y - a.y);

function push(into: Placed[], points: readonly Placed[]): void {
  for (const point of points) into.push(point);
}

/** The steadier fixes, plus the vague ones of any stretch that would otherwise be a long straight jump. */
function steadier(points: readonly Placed[]): Placed[] {
  const drawn: Placed[] = [];
  let skipped: Placed[] = [];
  for (const point of points) {
    if (!point.isPinned && point.fix.accuracyM > DISPLAY_MAX_ACCURACY_M) {
      skipped.push(point);
      continue;
    }
    const from = drawn[drawn.length - 1] ?? skipped[0];
    if (from && skipped.length > 0 && gapM(from, point) > DISPLAY_MAX_GAP_M) push(drawn, skipped);
    skipped = [];
    drawn.push(point);
  }
  return drawn;
}

/** The point of a run of fixes: their average, the more accurate counting for more. */
function holdOf(run: readonly Placed[], metresPerDegreeLng: number): Placed {
  let weight = 0;
  let x = 0;
  let y = 0;
  let accuracyM = Infinity;
  for (const point of run) {
    const w = 1 / point.fix.accuracyM ** 2;
    weight += w;
    x += point.x * w;
    y += point.y * w;
    accuracyM = Math.min(accuracyM, point.fix.accuracyM);
  }
  const [first] = run;
  const centre = { x: x / weight, y: y / weight };
  const dx = centre.x - first.x;
  const dy = centre.y - first.y;
  return {
    fix: {
      time: first.fix.time,
      at: [first.fix.at[0] + dx / metresPerDegreeLng, first.fix.at[1] + dy / METRES_PER_DEGREE],
      accuracyM,
    },
    ...centre,
    isPinned: true,
  };
}

/** A run of fixes that never leaves its first fix's accuracy circle (up to HOLD_MAX_RADIUS_M) for HOLD_MIN_SECONDS becomes one point. */
function held(points: readonly Placed[], metresPerDegreeLng: number): Placed[] {
  const out: Placed[] = [];
  let i = 0;
  while (i < points.length) {
    const anchor = points[i];
    let end = i + 1;
    while (!anchor.isPinned && end < points.length) {
      const next = points[end];
      if (
        next.isPinned ||
        gapM(anchor, next) >
          Math.min(HOLD_MAX_RADIUS_M, Math.max(anchor.fix.accuracyM, next.fix.accuracyM))
      )
        break;
      end++;
    }
    const isStop = points[end - 1].fix.time - anchor.fix.time >= HOLD_MIN_SECONDS * 1000;
    if (end - i < 2 || !isStop) {
      out.push(anchor);
      i++;
      continue;
    }
    out.push(holdOf(points.slice(i, end), metresPerDegreeLng));
    i = end;
  }
  return out;
}

function isNoiseReversal(a: Placed, b: Placed, c: Placed): boolean {
  const ab = gapM(a, b);
  const bc = gapM(b, c);
  if (ab === 0 || bc === 0) return false;
  const limit =
    REVERSAL_MAX_LEG_ACCURACIES * Math.max(a.fix.accuracyM, b.fix.accuracyM, c.fix.accuracyM);
  if (ab > limit || bc > limit) return false;
  const cosTurn = ((b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y)) / (ab * bc);
  return cosTurn < REVERSAL_MIN_COS;
}

/** Each fix that doubles back on its neighbours within noise range is dropped: the line goes straight past it. */
function withoutReversals(points: readonly Placed[]): Placed[] {
  const out: Placed[] = [];
  for (const point of points) {
    const a = out[out.length - 2];
    const b = out[out.length - 1];
    if (a && b && !b.isPinned && isNoiseReversal(a, b, point)) out.pop();
    out.push(point);
  }
  return out;
}

/**
 * Each fix moves toward the average of itself and SMOOTH_RADIUS neighbours a
 * side, weighted by 1 / accuracy², so a steadier fix pulls harder. A moving
 * average is the simplest that works here: it needs no model of the vehicle
 * (a Kalman filter wants a speed and a process noise to tune), and the window
 * is symmetric and shrinks at the ends, so on a straight line it adds no
 * sideways drift and the first and last fix stay put. A fix never moves by more
 * than its own accuracy, so a real corner can be rounded off by that much and
 * no more.
 */
function smoothed(points: readonly Placed[], metresPerDegreeLng: number): Fix[] {
  return points.map((point, i) => {
    const radius = Math.min(SMOOTH_RADIUS, i, points.length - 1 - i);
    if (point.isPinned || radius === 0) return point.fix;
    let weight = 0;
    let x = 0;
    let y = 0;
    for (let j = i - radius; j <= i + radius; j++) {
      const w = 1 / points[j].fix.accuracyM ** 2;
      weight += w;
      x += points[j].x * w;
      y += points[j].y * w;
    }
    const dx = x / weight - point.x;
    const dy = y / weight - point.y;
    const moved = Math.hypot(dx, dy);
    const scale = moved > point.fix.accuracyM ? point.fix.accuracyM / moved : 1;
    return {
      ...point.fix,
      at: [
        point.fix.at[0] + (dx * scale) / metresPerDegreeLng,
        point.fix.at[1] + (dy * scale) / METRES_PER_DEGREE,
      ],
    };
  });
}

/**
 * The fixes to draw, in time order, for the fixes that count (keptFixes).
 * `pinned` are indexes into `kept` of fixes that must stay exactly as they are
 * (where a way switch or a mark is placed), so each marker lies on the line.
 */
export function displayFixes(kept: readonly Fix[], pinned: readonly number[] = []): Fix[] {
  const first = kept[0];
  if (!first) return [];
  const [lng0, lat0] = first.at;
  const metresPerDegreeLng = METRES_PER_DEGREE * Math.cos((lat0 * Math.PI) / 180);
  // The last fix is where the contributor is: the line always reaches it.
  const pins = new Set([...pinned, kept.length - 1]);
  const placed = kept.map((fix, i): Placed => ({
    fix,
    x: (fix.at[0] - lng0) * metresPerDegreeLng,
    y: (fix.at[1] - lat0) * METRES_PER_DEGREE,
    isPinned: pins.has(i),
  }));
  return smoothed(withoutReversals(held(steadier(placed), metresPerDegreeLng)), metresPerDegreeLng);
}
