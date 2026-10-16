import type { LngLat } from '@/shared/utils/geo';
import { zoomForScale } from '@/shared/utils/geo';

import type { LocatorMode } from './locator-button';

export type LocatorStatus = 'off' | 'asking' | 'on' | 'denied' | 'unavailable';

/** Where the camera is with the commuter: elsewhere, on them, on them turned with the phone. */
export type Camera = 'free' | 'tracked' | 'compass';

export interface Fix {
  at: LngLat;
  /** Metres, the browser's 68 % radius. */
  accuracy: number;
  /** Metres a second, the browser's or derived from the last fixes. */
  speed: number;
  /** Degrees clockwise from north, from the fixes; null until they have shown one. */
  heading: number | null;
  time: number;
}

/** Below this the GPS's own heading is noise: a slow shuffle, or drift while still. */
export const STILL_BELOW_MPS = 0.5;

/**
 * The camera's "height" is the map's scale bar, metres per SCALE_PX on the
 * screen (geo.ts). A tap to the commuter keeps the zoom the map is at, so the
 * view height does not jump, unless the bar reads more than FAR_SCALE_M, when
 * it comes in to TRACKED_SCALE_M; the compass view is COMPASS_SCALE_M.
 */
export const TRACKED_SCALE_M = 200;
export const COMPASS_SCALE_M = 200;
const FAR_SCALE_M = 2000;

/**
 * The accuracy circle shows the fix's own radius, held between these: a fix
 * indoors or off the wifi can say 1 km, and a good one 3 m — a circle under the dot.
 */
export const ACCURACY_MIN_M = 40;
export const ACCURACY_MAX_M = 80;
/**
 * A watch that has given no fix for this long has gone quiet, and a tap
 * starts a new one. A phone with location on gives one about every second.
 */
export const QUIET_MS = 10_000;
/** How far the compass view tilts: "slightly ... diagonally", as Google's does. */
const COMPASS_PITCH = 45;

/**
 * How big the dot and its beam are drawn at `zoom`. Like Google Maps', they
 * stay small zoomed out: Figma's full size from street level in, shrinking
 * with each zoom out to SMALLEST at city level, and no smaller, so it is
 * still seen.
 */
export function indicatorScale(zoom: number): number {
  const FULL_FROM = 16;
  const SMALLEST_AT = 12;
  const SMALLEST = 0.54;
  const t = Math.min(1, Math.max(0, (zoom - SMALLEST_AT) / (FULL_FROM - SMALLEST_AT)));
  return SMALLEST + (1 - SMALLEST) * t;
}

/**
 * The button's look for where the camera is, and whether there is a fix to
 * be on: none yet — not asked, refused, asking, or no fix in — is
 * LocationOff, and a tap asks for it.
 */
export function modeFor(camera: Camera, located: boolean): LocatorMode {
  if (!located) return 'LocationOff';
  if (camera === 'free') return 'TrackOwnLocation';
  return camera === 'tracked' ? 'TrackedLocation' : 'TracksTheMapBasedOnCompassFacing';
}

/** Where a tap takes the camera: to the commuter; then round, tracked ⇄ compass, once the phone's compass has been read. */
export function afterTap(camera: Camera, compass: boolean): Camera {
  return camera === 'tracked' && compass ? 'compass' : 'tracked';
}

/**
 * The zoom a tap to the commuter keeps: the map's own, unless its scale bar
 * reads more than FAR_SCALE_M, when it comes in to TRACKED_SCALE_M.
 */
export function trackedZoom(current: number, lat: number): number {
  return current < zoomForScale(FAR_SCALE_M, lat) ? zoomForScale(TRACKED_SCALE_M, lat) : current;
}

/** The accuracy circle's radius for a fix this good. */
export const circleRadius = (accuracy: number) =>
  Math.min(ACCURACY_MAX_M, Math.max(ACCURACY_MIN_M, accuracy));

interface CommuterCameraInput {
  /** Where the camera is with the commuter; `free` is not followed. */
  camera: Exclude<Camera, 'free'>;
  fix: Fix;
  /** The way the phone faces, for the compass view; null with none. */
  turn: number | null;
  /** TrackedLocation's zoom, kept through the compass view and back. */
  keptZoom: number;
  /** The map's bearing now: the compass view with no turn to go by stays as it is. */
  mapBearing: number;
  /** A tap or a change of the card's height, which moves the camera more slowly. */
  tapped: boolean;
}

/** What the camera does to follow the commuter, as MapLibre's `easeTo` takes it, less the offset. */
export interface CommuterCamera {
  center: LngLat;
  zoom: number;
  pitch: number;
  bearing: number;
  duration: number;
}

/** The whole view the camera takes on the commuter's fix, not only the centre. */
export function commuterCamera({
  camera,
  fix,
  turn,
  keptZoom,
  mapBearing,
  tapped,
}: CommuterCameraInput): CommuterCamera {
  return {
    center: fix.at,
    zoom: camera === 'compass' ? zoomForScale(COMPASS_SCALE_M, fix.at[1]) : keptZoom,
    pitch: camera === 'compass' ? COMPASS_PITCH : 0,
    bearing: camera === 'compass' ? (turn ?? mapBearing) : 0,
    duration: tapped ? 800 : 400,
  };
}
