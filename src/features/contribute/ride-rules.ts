import { distanceM, keptFixes, type Fix } from '@/features/routes/model/ride-recording';
import type { LngLat } from '@/shared/utils/geo';

/*
 * The one place the page calls the leg, marker, auto-stop and bearing rules.
 * claude/contribute-rules puts the real ones in ride-recording.ts; until it is
 * merged these are stand-ins with the same job, and the merge is this file's
 * imports. Nothing else in the feature reads the rules any other way.
 */

/** Which way round the loop the contributor is: papunta first, then pabalik. */
export type LegName = 'papunta' | 'pabalik';

/** A tap on the leg button: when, and where the ride was. */
export interface SwitchEvent {
  time: number;
  at: LngLat;
}

/** A stretch of the ride on one leg, joined to the one before it at the switch. */
export interface Leg {
  name: LegName;
  path: LngLat[];
}

/** The leg as the contributor reads it: `Papunta`. */
export const LEG_LABEL = { papunta: 'Papunta', pabalik: 'Pabalik' } satisfies Record<
  LegName,
  string
>;

/** The first leg is papunta and every switch flips it. */
export function legAfter(switchCount: number): LegName {
  return switchCount % 2 === 0 ? 'papunta' : 'pabalik';
}

/** The fixes that count, cut into legs at each switch. */
export function legsOf(fixes: readonly Fix[], switches: readonly SwitchEvent[]): Leg[] {
  const kept = keptFixes(fixes);
  const legs: Leg[] = [];
  let from = -Infinity;
  for (let i = 0; i <= switches.length; i++) {
    const to = i < switches.length ? switches[i].time : Infinity;
    const path = kept.filter((f) => f.time > from && f.time <= to).map((f) => f.at);
    const joint = legs[legs.length - 1]?.path.at(-1);
    legs.push({ name: legAfter(i), path: joint ? [joint, ...path] : path });
    from = to;
  }
  return legs;
}

/** Where each switch happened, for the dot drawn there. */
export function markersOf(switches: readonly SwitchEvent[]): LngLat[] {
  return switches.map((s) => s.at);
}

/** Past this far, and a Pabalik tap, coming back near the start ends the ride. */
const ARM_DISTANCE_M = 1000;
const RETURN_RADIUS_M = 300;

export interface AutoStopInput {
  rideDistanceM: number;
  start: LngLat | null;
  here: LngLat | null;
  switchCount: number;
}

/** Whether the ride has gone out, turned back and come home. */
export function shouldAutoStop({
  rideDistanceM,
  start,
  here,
  switchCount,
}: AutoStopInput): boolean {
  if (!start || !here || switchCount < 1 || rideDistanceM <= ARM_DISTANCE_M) return false;
  return distanceM(start, here) <= RETURN_RADIUS_M;
}

/** The last few metres' direction of travel in degrees from north, or null while standing still. */
export function courseBearing(fixes: readonly Fix[]): number | null {
  const kept = keptFixes(fixes);
  const last = kept.at(-1);
  if (!last) return null;
  const before = [...kept].reverse().find((f) => distanceM(f.at, last.at) >= 10);
  if (!before) return null;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLng = toRad(last.at[0] - before.at[0]);
  const lat1 = toRad(before.at[1]);
  const lat2 = toRad(last.at[1]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
