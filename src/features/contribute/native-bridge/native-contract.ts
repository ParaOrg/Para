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
} as const;

/**
 * The accuracy a fix with none gets: far past what the recorder keeps, so it never draws.
 * RideNotification.java's NO_ACCURACY_M is the same, for the notification's distance.
 */
export const NO_ACCURACY_M = 1_000;

// The ride's notification (RidePlugin.java, RideState.java).

/** The ride's phases as the page tells them. RideState also has "finished", which only a tap makes. */
export const RIDE_PHASES = ['recording', 'paused', 'none'] as const;

/** Lakad and Sakay, as both sides write them. */
export const RIDE_MODES = ['walk', 'ride'] as const satisfies readonly Mode[];

/** The kinds of tap RideActionReceiver.java keeps for the page. */
export const RIDE_EVENT_KINDS = ['mode', 'pause', 'resume', 'finish'] as const;

/** What RidePlugin.java tells the page as a tap is made while it is awake. */
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

/** What the page tells the notification (RidePlugin.java setState). */
export const rideStateSchema = z.object({
  recordingId: z.string(),
  phase: z.enum(RIDE_PHASES),
  mode: z.enum(RIDE_MODES),
  startedAt: z.number(),
  /** Time paused before now, the pause now running left out. */
  pausedSeconds: z.number(),
  /** Where a paused ride stopped. */
  stoppedAt: z.nullable(z.number()),
  /** The page's watch is on: the ride's service records for it (native/native-location.ts). */
  isWatching: z.boolean(),
});

export type RideState = z.infer<typeof rideStateSchema>;

/** Where the ride is, as the recorder says it; native/ride-notice.ts adds whether it watches. */
export type RideNoticeState = Omit<RideState, 'isWatching'>;

/** A tap made on the notification while the page slept (RideState.java addEvent). */
export const rideEventSchema = z.object({
  kind: z.enum(RIDE_EVENT_KINDS),
  time: z.number(),
  /** The mode switched to, on a `mode` tap. */
  to: z.optional(z.enum(RIDE_MODES)),
  /** The recording it was tapped on. */
  recordingId: z.string(),
});

export type RideEvent = z.infer<typeof rideEventSchema>;

/** What RidePlugin.java's events() returns. */
export const rideEventsSchema = z.object({ events: z.array(rideEventSchema) });

/** What a run of taps on the notification did to a ride, in order. */
export interface RideTaps {
  /** Each switch of mode, where it was tapped. */
  switches: { time: number; to: Mode }[];
  /** Each pause that was resumed: native kept no fix inside it. */
  pauses: { from: number; to: number }[];
  /** A pause not resumed yet: the ride stands stopped there. */
  openPause: number | null;
  /** Finish: the ride waits for its details. */
  finishedAt: number | null;
  /** The last tap's time: those up to it are taken. */
  lastTime: number;
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
