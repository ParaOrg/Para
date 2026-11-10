// What the page and the Android app (android/app/src/main/java/ph/para/contributor/) say to each
// other: the plugins' names, the keys and values each side writes, and the shapes they read. The
// Java holds the same names as string literals, so tests/unit/native-contract-test.mjs reads the
// Java sources for every one of them: a rename on either side fails there.
//
// It sits in native-bridge/, not native/, because the recorder on the web path names these shapes.
// Code on the web path imports only its types, so the web build carries none of it.
import * as z from 'zod/mini';

import type { Mode } from '@/features/routes/model/ride-recording';

/** The names the app's plugins register under: @CapacitorPlugin(name) in the Java. */
export const PLUGIN_NAMES = {
  ride: 'Ride',
  fixLog: 'FixLog',
  nativePermissions: 'NativePermissions',
  shareImage: 'ShareImage',
} as const;

/**
 * The accuracy a fix with none gets: far past what the recorder keeps, so it never draws.
 * RideNotification.java's NO_ACCURACY_M is the same, for the notification's distance.
 */
export const NO_ACCURACY_M = 1_000;

// The ride on the phone (RidePlugin.java, RideState.java, ride/Ride.java).

/** The ride's phases as the page tells them. The phone also has "finished", which only a tap makes. */
export const RIDE_PHASES = ['recording', 'paused', 'none'] as const;

/** The ride's phases as the phone has them (ride/Ride.java). */
export const NATIVE_RIDE_PHASES = ['none', 'recording', 'paused', 'finished'] as const;

/** Lakad and Sakay, as both sides write them. */
export const RIDE_MODES = ['walk', 'ride'] as const satisfies readonly Mode[];

/** The gaps both sides keep in the ride's history (ride/Ride.java GAP_PAUSED, GAP_RESUMED). */
export const RIDE_GAP_REASONS = ['paused', 'resumed'] as const;

/** Why a ride recording is cut off: nothing records it (ride/Ride.java). */
export const RIDE_CUT_OFF_TROUBLES = ['cut-off', 'phone-restarted'] as const;

/** What RidePlugin.java tells the page as the ride changes on the phone while it is awake. */
export const RIDE_EVENT_NAME = 'rideEvent';

/** What RidePlugin.java hands the page each fix of the ride's service as, while it is there. */
export const RIDE_FIX_EVENT_NAME = 'rideFix';

/** What RidePlugin.java tells the page when the ride's service cannot record. */
export const RIDE_FIX_PROBLEM_EVENT_NAME = 'rideFixProblem';

/** Why the ride's service cannot record: no permission, or no location to give. */
export const RIDE_FIX_PROBLEM_CODES = ['DENIED', 'UNAVAILABLE'] as const;

export const rideFixProblemSchema = z.object({
  code: z.enum(RIDE_FIX_PROBLEM_CODES),
  message: z.string(),
});

export type RideFixProblem = z.infer<typeof rideFixProblemSchema>;

const modeSwitchSchema = z.object({ time: z.number(), to: z.enum(RIDE_MODES) });

/** A gap in the ride's history; `to` is 0 while it runs (a pause now). */
const rideGapSchema = z.object({
  from: z.number(),
  to: z.number(),
  reason: z.enum(RIDE_GAP_REASONS),
});

export type RideGap = z.infer<typeof rideGapSchema>;

/** What the page tells the phone (RidePlugin.java setState): where the ride is, with its history. */
export const rideStateSchema = z.object({
  recordingId: z.string(),
  phase: z.enum(RIDE_PHASES),
  startedAt: z.number(),
  /** Each switch of mode, the first at the start. */
  modes: z.array(modeSwitchSchema),
  /** Its closed paused and resumed gaps. */
  gaps: z.array(rideGapSchema),
  /** Where a paused ride stopped. */
  stoppedAt: z.nullable(z.number()),
  /** The page's watch is on: the ride's service records for it (native/native-location.ts). */
  isWatching: z.boolean(),
});

export type RideState = z.infer<typeof rideStateSchema>;

/** Where the ride is, as the recorder says it; native/ride-notice.ts adds whether it watches. */
export type RideNoticeState = Omit<RideState, 'isWatching'>;

/** The ride as the phone has it (RidePlugin.java now, RideJson.java). */
export const nativeRideSchema = z.object({
  recordingId: z.string(),
  phase: z.enum(NATIVE_RIDE_PHASES),
  /** What is wrong, if anything: "none", or why it has no location, or why it is cut off. */
  trouble: z.string(),
  startedAt: z.number(),
  finishedAt: z.number(),
  lastFixAt: z.number(),
  modes: z.array(modeSwitchSchema),
  gaps: z.array(rideGapSchema),
});

export type NativeRide = z.infer<typeof nativeRideSchema>;

/** What RidePlugin.java's now() returns. */
export const rideNowSchema = z.object({ ride: nativeRideSchema, isServiceRunning: z.boolean() });

export type RideNow = z.infer<typeof rideNowSchema>;

/** What the phone's ride did that the page has to take: its switches, its gaps, and its Stop. */
export interface RideTaps {
  /** Each switch of mode, where it was made. */
  switches: { time: number; to: Mode }[];
  /** Each closed gap: a pause resumed, or the time lost before a cut-off ride was resumed. */
  gaps: { from: number; to: number; reason: RideGap['reason'] }[];
  /** A pause not resumed yet: the ride stands stopped there. */
  openPause: number | null;
  /** Finish: the ride waits for its details. */
  finishedAt: number | null;
}

// The native fix log (FixLog.java, FixLogPlugin.java).

/** One fix as FixLog.java writes it: accuracyM only when the phone gave one. */
export const fixLineSchema = z.object({
  time: z.number(),
  lng: z.number(),
  lat: z.number(),
  accuracyM: z.optional(z.number()),
});

/** What FixLog.java read() returns; each fix is read on its own, so one bad line loses only itself. */
export const fixLogSchema = z.object({
  recordingId: z.nullable(z.string()),
  fixes: z.array(z.unknown()),
});

// Fixes and failures, from the browser's watch or the ride's service.

/** The part of a position the recorder uses; the browser's and the app's both fit it. */
export interface WatchedFix {
  timestamp: number;
  coords: { longitude: number; latitude: number; accuracy: number };
}

/** A failed location request: 1 denied, 2 unavailable, 3 timed out, as the browser numbers them. */
export interface WatchError {
  code: number;
  message: string;
}
