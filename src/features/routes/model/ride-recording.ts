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

/**
 * Why a stretch of time has no fixes. `paused` is the contributor's own Stop
 * and Resume, which is not the phone's fault and is left out of the lost time.
 */
export type GapReason = 'hidden' | 'silent' | 'resumed' | 'paused';

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
/** Fixes that are all too fast for the last one that counted, but agree with each other, start a new anchor. */
export const REANCHOR_AFTER = 3;

const byTime = (a: Fix, b: Fix): number => a.time - b.time;

function speedKmh(from: Fix, to: Fix): number {
  return (distanceM(from.at, to.at) / ((to.time - from.time) / 1000)) * 3.6;
}

/**
 * The fixes that count, in time order: each is accurate enough, and implies no
 * more than MAX_SPEED_KMH from the last one that counted. A fix that is ignored
 * does not become the point the next is measured from, with one exception: if
 * the first fixes were wrong, every later one would look like a jump, so
 * REANCHOR_AFTER fast fixes in a row that agree with each other (each implies
 * no more than MAX_SPEED_KMH from the one before) are taken as the true
 * position, and the few fixes before them, which they contradict, are dropped.
 */
export function keptFixes(fixes: readonly Fix[]): Fix[] {
  let kept: Fix[] = [];
  let pending: Fix[] = [];
  for (const fix of [...fixes].sort(byTime)) {
    if (fix.accuracyM > MAX_ACCURACY_M) continue;
    const last = kept[kept.length - 1];
    if (last && fix.time <= last.time) continue;
    if (!last || speedKmh(last, fix) <= MAX_SPEED_KMH) {
      kept.push(fix);
      pending = [];
      continue;
    }
    const before = pending[pending.length - 1];
    pending = before && speedKmh(before, fix) <= MAX_SPEED_KMH ? [...pending, fix] : [fix];
    if (pending.length >= REANCHOR_AFTER) {
      if (kept.length < REANCHOR_AFTER) kept = [];
      kept.push(...pending);
      pending = [];
    }
  }
  return kept;
}

/**
 * The length of the path through these fixes, in metres. Across a gap the
 * straight line counts. Within a hinto it does not: standing still, the phone's
 * position wanders a few metres, and every wander is a leg that would add up.
 */
export function pathLengthM(fixes: readonly Fix[], hintos: readonly Hinto[] = []): number {
  const inside = (fix: Fix) => hintos.find((h) => fix.time >= h.from && fix.time <= h.to);
  let total = 0;
  for (let i = 1; i < fixes.length; i++) {
    const was = inside(fixes[i - 1]);
    if (was && was === inside(fixes[i])) continue;
    total += distanceM(fixes[i - 1].at, fixes[i].at);
  }
  return total;
}

/** Hintos that touch, or are no more than SILENCE_SECONDS apart, joined into one. */
function mergeHintos(hintos: readonly Hinto[]): Hinto[] {
  const merged: Hinto[] = [];
  for (const hinto of hintos) {
    const last = merged[merged.length - 1];
    if (last && (hinto.from - last.to) / 1000 <= SILENCE_SECONDS) {
      merged[merged.length - 1] = { ...last, to: Math.max(last.to, hinto.to) };
    } else {
      merged.push(hinto);
    }
  }
  return merged;
}

/**
 * Where the ride stood: each run of fixes that stays within HINTO_RADIUS_M of
 * the run's first fix and lasts HINTO_MIN_SECONDS or more. Runs that touch, or
 * are a few seconds apart, are one hinto: a crawl is a string of short runs,
 * and a single wild fix splits a long stand in two. Expects fixes that count
 * (keptFixes), in time order.
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
  return mergeHintos(hintos);
}

/**
 * Stretches with no fixes. The silence clock starts at `from`, the start of the
 * recording, and again at the end of each `paused` gap (a Stop and Resume), and
 * runs to `now`: the end of the recording, or the present while it runs. So
 * the wait for the first fix counts, and so does a phone that never answers.
 * Every fix the phone reported counts, kept or not: the phone was answering.
 */
export function silentGaps(
  fixes: readonly Fix[],
  from: number,
  now: number,
  paused: readonly Gap[] = [],
): Gap[] {
  const gaps: Gap[] = [];
  const times = [...fixes].sort(byTime).map((f) => f.time);
  const pauses = mergeGaps(paused);
  // The stretches the recording was running: between the pauses.
  const runs: [number, number][] = [];
  let runStart = from;
  for (const pause of pauses) {
    if (pause.to <= runStart) continue;
    if (pause.from > runStart) runs.push([runStart, Math.min(pause.from, now)]);
    runStart = Math.max(runStart, pause.to);
  }
  if (runStart < now) runs.push([runStart, now]);
  for (const [runFrom, runTo] of runs) {
    let last = runFrom;
    const silent = (to: number) => {
      if ((to - last) / 1000 > SILENCE_SECONDS) gaps.push({ from: last, to, reasons: ['silent'] });
    };
    for (const time of times) {
      if (time < runFrom || time > runTo) continue;
      silent(time);
      last = time;
    }
    silent(runTo);
  }
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

const secondsIn = (gaps: readonly Gap[]): number =>
  gaps.reduce((sum, g) => sum + (g.to - g.from) / 1000, 0);

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
  /** Time the phone did not record: the merged gaps, clipped to the recording, without the pauses. */
  lostSeconds: number;
  /** The contributor's own Stop and Resume pauses, which are neither moving nor lost. */
  pausedSeconds: number;
  /** Where the vehicle stood: the stands made on ride (rideHintos). */
  hintos: Hinto[];
  /** The gaps, merged, without the pauses. */
  gaps: Gap[];
}

/** The parts of `gap` that fall inside each of `within`. */
function overlapsWith(gap: Gap, within: readonly Gap[]): Gap[] {
  return within
    .map((w) => ({ ...gap, from: Math.max(gap.from, w.from), to: Math.min(gap.to, w.to) }))
    .filter((g) => g.to > g.from);
}

/**
 * The totals of a recording. `logged` are the gaps the page saw happen
 * (hidden, resumed after a reload, paused between a Stop and a Resume); the
 * silent ones are found from the fixes. Standing is the time stood still, on
 * foot or riding, that was neither lost nor paused, and moving is what is left
 * of the recorded span once standing, lost and paused time are taken out.
 * Distance and time are the whole recording's, walked and ridden; `modes`
 * only decides which stands are hintos (rideHintos), and none means all ride.
 */
export function summarize(
  fixes: readonly Fix[],
  logged: readonly Gap[],
  from: number,
  now: number,
  modes: readonly ModeSwitch[] = [],
): RideSummary {
  const clip = (g: Gap): Gap => ({ ...g, from: Math.max(g.from, from), to: Math.min(g.to, now) });
  const inside = (g: Gap): boolean => g.to > g.from;
  const paused = mergeGaps(logged.filter((g) => g.reasons.includes('paused')).map(clip)).filter(
    inside,
  );
  const silent = silentGaps(fixes, from, now, paused);
  // The page hidden is lost time only where no fix came in: a phone that kept
  // locating in the background lost nothing.
  const others = logged
    .filter((g) => !g.reasons.includes('paused'))
    .flatMap((g) => (g.reasons.every((r) => r === 'hidden') ? overlapsWith(g, silent) : [g]));
  const kept = keptFixes(fixes);
  const gaps = mergeGaps([...others, ...silent])
    .map(clip)
    .filter(inside);
  const blocked = mergeGaps([...gaps, ...paused]);
  const hintos = hintosOf(kept);
  const standingSeconds = hintos.reduce(
    (sum, h) => sum + (h.to - h.from) / 1000 - overlapSeconds(h.from, h.to, blocked),
    0,
  );
  const pausedSeconds = secondsIn(paused);
  const lostSeconds = secondsIn(blocked) - pausedSeconds;
  const spanSeconds = Math.max(0, (now - from) / 1000);
  return {
    fixCount: fixes.length,
    keptCount: kept.length,
    distanceM: pathLengthM(kept, hintos),
    movingSeconds: Math.max(0, spanSeconds - secondsIn(blocked) - standingSeconds),
    standingSeconds,
    lostSeconds,
    pausedSeconds,
    hintos: rideHintos(hintos, modes),
    gaps,
  };
}

/*
 * One recording holds the contributor's walking (Lakad) and riding (Sakay),
 * in turns. A recording starts on walk; a switch flips the mode and leaves a
 * marker at the fix it happened on. A recording with no switches at all is all
 * ride: one made before modes, when every recording was a ride. The functions
 * below take fixes that count (keptFixes), in time order, as hintosOf does.
 */

/** How the contributor is moving: on foot (Lakad), or on a vehicle (Sakay). */
export type Mode = 'walk' | 'ride';

/** The contributor pressing the switch, or starting: from then on the recording is on `to`. */
export interface ModeSwitch {
  time: number;
  to: Mode;
}

/** Where a switch left its mark: the fix it happened on, and the mode that began there. */
export interface ModeMarker {
  /** When the contributor pressed the switch. */
  time: number;
  at: LngLat;
  to: Mode;
}

/** The recording split by mode, ready to draw as walked and ridden lines. */
export interface RecordedModes {
  /** Each run of fixes on foot, as a line. Every switch back to walk makes another. */
  walkLines: LngLat[][];
  rideLines: LngLat[][];
  /** One per switch after the first fix; the mode a recording starts on leaves none. */
  markers: ModeMarker[];
}

/** A stretch of time, in milliseconds since the epoch. */
export interface TimeSpan {
  from: number;
  to: number;
}

/**
 * The switches that change the mode, in time order. The mode before the first
 * is ride, so a switch to ride with none before it is dropped, and so is one to
 * the mode already on.
 */
function effectiveSwitches(switches: readonly ModeSwitch[]): ModeSwitch[] {
  let mode: Mode = 'ride';
  return [...switches]
    .sort((a, b) => a.time - b.time)
    .filter((modeSwitch) => {
      if (modeSwitch.to === mode) return false;
      mode = modeSwitch.to;
      return true;
    });
}

/** The mode the recording is on now: the last switch that changed it, or ride with none. */
export function currentMode(switches: readonly ModeSwitch[]): Mode {
  return effectiveSwitches(switches).at(-1)?.to ?? 'ride';
}

interface PlacedSwitch extends ModeSwitch {
  /** The fix the switch happened on: the last one at or before it. */
  index: number;
}

/**
 * Where the switches fall among the fixes. Switches at or before the first fix
 * set the mode it starts on. Each later one is placed on the last fix at or
 * before it.
 */
function placedModes(
  fixes: readonly Fix[],
  switches: readonly ModeSwitch[],
): { first: Mode; placed: PlacedSwitch[] } {
  const effective = effectiveSwitches(switches);
  const firstTime = fixes[0]?.time ?? Infinity;
  const first = effective.filter((s) => s.time <= firstTime).at(-1)?.to ?? 'ride';
  const placed: PlacedSwitch[] = [];
  let index = 0;
  for (const modeSwitch of effective) {
    if (modeSwitch.time <= firstTime) continue;
    while (index + 1 < fixes.length && fixes[index + 1].time <= modeSwitch.time) index++;
    placed.push({ ...modeSwitch, index });
  }
  return { first, placed };
}

/** The index, among these fixes, of the fix each switch happened on: where its marker sits. */
export function modeFixIndexes(fixes: readonly Fix[], switches: readonly ModeSwitch[]): number[] {
  return placedModes(fixes, switches).placed.map((placed) => placed.index);
}

/**
 * The fixes split into walked and ridden lines. The fix a switch is placed on
 * ends the old line and begins the new, so the two meet there with no gap, and
 * carries its marker; the mode the recording starts on leaves none. A run of
 * one fix is no line and is left out.
 */
export function modesOf(fixes: readonly Fix[], switches: readonly ModeSwitch[]): RecordedModes {
  const modes: RecordedModes = { walkLines: [], rideLines: [], markers: [] };
  const { first, placed } = placedModes(fixes, switches);
  let mode = first;
  let run: LngLat[] = [];
  const close = () => {
    if (run.length >= 2) (mode === 'walk' ? modes.walkLines : modes.rideLines).push(run);
  };
  fixes.forEach((fix, i) => {
    run.push(fix.at);
    for (const modeSwitch of placed) {
      if (modeSwitch.index !== i) continue;
      close();
      modes.markers.push({ time: modeSwitch.time, at: fix.at, to: modeSwitch.to });
      mode = modeSwitch.to;
      run = [fix.at];
    }
  });
  close();
  return modes;
}

/** The stretches of `from`–`to` the recording was on ride, in time order. */
export function rideSpans(switches: readonly ModeSwitch[], from: number, to: number): TimeSpan[] {
  const spans: TimeSpan[] = [];
  let mode: Mode = 'ride';
  let since = from;
  for (const modeSwitch of effectiveSwitches(switches)) {
    const time = Math.min(Math.max(modeSwitch.time, from), to);
    if (mode === 'ride' && time > since) spans.push({ from: since, to: time });
    mode = modeSwitch.to;
    since = time;
  }
  if (mode === 'ride' && to > since) spans.push({ from: since, to });
  return spans;
}

/**
 * The hintos made while riding: a hinto is where a vehicle stood, and on foot
 * the contributor stands for their own reasons. A hinto that runs across a
 * switch keeps the part on ride, if that part alone is long enough to be one.
 */
export function rideHintos(hintos: readonly Hinto[], switches: readonly ModeSwitch[]): Hinto[] {
  return hintos.flatMap((hinto) =>
    rideSpans(switches, hinto.from, hinto.to)
      .filter((span) => (span.to - span.from) / 1000 >= HINTO_MIN_SECONDS)
      .map((span) => ({ ...span, at: hinto.at })),
  );
}

/**
 * A direction of travel needs the recent fixes' older and newer halves to sit
 * this far apart (their averages, not single fixes); less is the phone's
 * wander, not a heading. A jeep at 15 km/h covers about 21 m between the
 * halves, so it still gets a heading, and a crawl keeps the last one.
 */
export const BEARING_MIN_M = 20;
/**
 * The fixes that decide a heading are the ones this recent. Standing, the
 * phone drifts (HINTO_RADIUS_M allows 25 m); with no time limit the drift adds
 * up to a heading and the map turns while the contributor waits. It also stops
 * a heading being measured from before a stop.
 */
export const BEARING_WINDOW_S = 10;
/**
 * Each half needs this many fixes. One phone fix is off by 8 m or more; the
 * average of several is off by about that over their square root, so a false
 * 20 m between the halves is rare where between two single fixes it is not.
 */
const BEARING_MIN_FIXES_PER_HALF = 2;

/** The initial great-circle bearing from one point to another, in degrees clockwise from north. */
function bearingBetween([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** The average position of some fixes; short distances only, where lng and lat average plainly. */
function meanPosition(fixes: readonly Fix[]): LngLat {
  const sum = fixes.reduce<LngLat>((acc, fix) => [acc[0] + fix.at[0], acc[1] + fix.at[1]], [0, 0]);
  return [sum[0] / fixes.length, sum[1] / fixes.length];
}

/**
 * The direction of travel for a course-up map, in degrees clockwise from
 * north. The kept fixes within BEARING_WINDOW_S of the latest one are split by
 * time into an older and a newer half; each needs at least two fixes, and the
 * heading runs from the older half's average position to the newer half's,
 * which must sit BEARING_MIN_M apart. Anything less (standing, crawling, too
 * few fixes) gives `previous`, or null when there is none, so the map keeps the
 * heading it had. Averaging first is what stops GPS noise turning the map.
 */
export function courseBearing(fixes: readonly Fix[], previous: number | null): number | null {
  const latest = fixes[fixes.length - 1];
  if (!latest) return previous;
  const recent = fixes.filter((fix) => latest.time - fix.time <= BEARING_WINDOW_S * 1000);
  const middle = (recent[0].time + latest.time) / 2;
  const older = recent.filter((fix) => fix.time < middle);
  const newer = recent.filter((fix) => fix.time >= middle);
  if (older.length < BEARING_MIN_FIXES_PER_HALF || newer.length < BEARING_MIN_FIXES_PER_HALF) {
    return previous;
  }
  const from = meanPosition(older);
  const to = meanPosition(newer);
  return distanceM(from, to) >= BEARING_MIN_M ? bearingBetween(from, to) : previous;
}
