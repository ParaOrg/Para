import * as z from 'zod/mini';

import { lazyPlugin } from '../native-bridge/native-app';
import type { RideEvent } from '../recorder/ride-events';

/** Where the ride is, as the app's notification shows it (RidePlugin.java setState). */
export interface RideNoticeState {
  recordingId: string;
  phase: 'recording' | 'paused' | 'none';
  mode: 'walk' | 'ride';
  startedAt: number;
  /** Time paused before now, the pause now running left out. */
  pausedSeconds: number;
  /** Where a paused ride stopped. */
  stoppedAt: number | null;
}

interface RidePlugin {
  setState: (state: RideNoticeState & { watcherId: string }) => Promise<void>;
  events: () => Promise<unknown>;
  dropEvents: (options: { time: number }) => Promise<void>;
  addListener: (
    event: 'rideEvent',
    listener: () => void,
  ) => Promise<{ remove: () => Promise<void> }>;
}

const eventsSchema = z.object({
  events: z.array(
    z.object({
      kind: z.enum(['mode', 'pause', 'resume', 'finish']),
      time: z.number(),
      to: z.optional(z.enum(['walk', 'ride'])),
      recordingId: z.string(),
    }),
  ),
});

const getPlugin = lazyPlugin<RidePlugin>('Ride');

// The page's watcher (native-location.ts) and the last state said: the notification needs both,
// and they change apart.
let watcherId = '';
let lastState: RideNoticeState | null = null;

function send(): Promise<void> {
  if (!lastState) return Promise.resolve();
  // Paused, the page holds no watcher: the notification's Resume then opens the app.
  const held = lastState.phase === 'recording' ? watcherId : '';
  return getPlugin().setState({ ...lastState, watcherId: held });
}

/** Tells the notification where the ride is now. */
export function setRideNoticeState(state: RideNoticeState): Promise<void> {
  lastState = state;
  return send();
}

/** The page's watcher started (its id) or let go (''). */
export function noteRideWatcher(id: string): void {
  watcherId = id;
  void send().catch((error: unknown) => {
    console.warn('The ride notification could not be told of the watch.', error);
  });
}

/** The taps made on the notification that the page has not applied yet, oldest first. */
export async function readRideEvents(): Promise<RideEvent[]> {
  return eventsSchema.parse(await getPlugin().events()).events;
}

/** Forgets the taps up to `time`: the page has applied them. */
export function dropRideEvents(time: number): Promise<void> {
  return getPlugin().dropEvents({ time: Math.floor(time) });
}

/** Hears a tap on the notification while the page is awake; returns what stops hearing. */
export function onRideEvent(listener: () => void): () => void {
  const handle = getPlugin().addListener('rideEvent', listener);
  return () => {
    void handle.then((h) => h.remove());
  };
}
