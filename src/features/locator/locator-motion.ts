import { haversine, type LngLat } from '@/shared/utils/geo';

import { STILL_BELOW_MPS, type Fix } from './locator-rules';

/** Compass bearing from a to b, degrees clockwise from north. */
export function bearing(a: LngLat, b: LngLat): number {
  const r = Math.PI / 180;
  const dLng = (b[0] - a[0]) * r;
  const [la, lb] = [a[1] * r, b[1] * r];
  const y = Math.sin(dLng) * Math.cos(lb);
  const x = Math.cos(la) * Math.sin(lb) - Math.sin(la) * Math.cos(lb) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Degrees between two headings, the short way round. */
export function apart(a: number, b: number): number {
  return Math.abs(((((a - b) % 360) + 540) % 360) - 180);
}

/** One fix of a run, as the speed and heading are worked out from it. */
export interface Sample {
  at: LngLat;
  accuracy: number;
  time: number;
}

/**
 * Speed and heading from a run of fixes, for a browser that gives neither
 * (a laptop, an emulator, many phones indoors). The last fix against the
 * newest one at least 2 s older, so two fixes a second apart do not read
 * GPS jitter as a sprint; heading only once they are further apart than
 * the jitter, else the last known heading.
 */
export function motionFrom(
  fixes: readonly Sample[],
  lastHeading: number | null,
): { speed: number; heading: number | null } {
  const last = fixes[fixes.length - 1];
  if (!last) return { speed: 0, heading: lastHeading };
  let ref: (typeof fixes)[number] | null = null;
  for (let i = fixes.length - 2; i >= 0; i--) {
    if (last.time - fixes[i].time >= 2000) {
      ref = fixes[i];
      break;
    }
  }
  if (!ref) return { speed: 0, heading: lastHeading };
  const metres = haversine(ref.at, last.at);
  const speed = metres / ((last.time - ref.time) / 1000);
  const heading =
    metres > Math.max(3, Math.min(ref.accuracy, last.accuracy) / 4)
      ? bearing(ref.at, last.at)
      : lastHeading;
  return { speed, heading };
}

/** A position as the browser's watch gives it, as far as a fix is made of it. */
export interface WatchPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number | null;
    heading: number | null;
  };
  timestamp: number;
}

/** A fix and the run of fixes it joins. */
export interface FixRun {
  fix: Fix;
  run: Sample[];
}

/**
 * The fix for a position the watch has given, and the run of fixes it joins:
 * those of the last 15 s and this one. The browser's speed is kept when it
 * gives one; its heading only while moving at STILL_BELOW_MPS or more, else
 * the one worked out from the run. `now` stands in for a position with no
 * timestamp.
 */
export function fixFrom(
  position: WatchPosition,
  run: readonly Sample[],
  lastHeading: number | null,
  now: number,
): FixRun {
  const { coords } = position;
  const at: LngLat = [coords.longitude, coords.latitude];
  const time = position.timestamp || now;
  const next = [
    ...run.filter((f) => time - f.time < 15_000),
    { at, accuracy: coords.accuracy, time },
  ];
  const derived = motionFrom(next, lastHeading);
  const speed = coords.speed !== null && coords.speed >= 0 ? coords.speed : derived.speed;
  const heading =
    coords.heading !== null && !Number.isNaN(coords.heading) && speed >= STILL_BELOW_MPS
      ? coords.heading
      : derived.heading;
  return { fix: { at, accuracy: coords.accuracy, speed, heading, time }, run: next };
}

/** What a phone's orientation event says, as far as a heading goes. */
export interface Orientation {
  alpha: number | null;
  absolute: boolean;
  webkitCompassHeading?: number;
}

/**
 * The way the phone's top faces, degrees clockwise from north, turned for
 * a screen held sideways: Safari's own compass heading, or an absolute
 * `alpha` (counter-clockwise from north, so turned round). Null: the
 * event has none — an `alpha` relative to wherever the phone started.
 */
export function compassHeading(e: Orientation, screenAngle: number): number | null {
  let h: number | null = null;
  if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading))
    h = e.webkitCompassHeading;
  else if (e.absolute && e.alpha !== null) h = 360 - e.alpha;
  return h === null ? null : (((h + screenAngle) % 360) + 360) % 360;
}
