import { lazyPlugin } from '../native-bridge/native-app';
import {
  PLUGIN_NAMES,
  recordingNowSchema,
  rideEventsSchema,
  RIDE_EVENT_NAME,
  type RideEvent,
  type RideNoticeState,
  type RideState,
} from '../native-bridge/native-contract';

interface RidePlugin {
  setState: (state: RideState) => Promise<void>;
  events: () => Promise<unknown>;
  recordingNow: () => Promise<unknown>;
  dropEvents: (options: { time: number }) => Promise<void>;
  addListener: (
    event: typeof RIDE_EVENT_NAME,
    listener: () => void,
  ) => Promise<{ remove: () => Promise<void> }>;
}

const getPlugin = lazyPlugin<RidePlugin>(PLUGIN_NAMES.ride);

// Whether the page's watch is on (native-location.ts) and the last state said: the notification
// needs both, and they change apart.
let isWatching = false;
let lastState: RideNoticeState | null = null;

function send(): Promise<void> {
  if (!lastState) return Promise.resolve();
  // Paused, the page has no watch on: the notification's Resume then opens the app.
  return getPlugin().setState({
    ...lastState,
    isWatching: isWatching && lastState.phase === 'recording',
  });
}

/** Tells the notification where the ride is now. */
export function setRideNoticeState(state: RideNoticeState): Promise<void> {
  lastState = state;
  return send();
}

/**
 * The page's watch started, or stopped. Told again only for a ride recording: for any other the
 * notification is told no watch whatever this says, and a "no ride" still standing from before a
 * Start would, sent again, stop the service the Start has just set going (RidePlugin.setState).
 */
export function noteRideWatch(isOn: boolean): void {
  isWatching = isOn;
  if (lastState?.phase !== 'recording') return;
  void send().catch((error: unknown) => {
    console.warn('The ride notification could not be told of the watch.', error);
  });
}

/** The ride the app's service is recording now, or null when it records none. */
export async function readRecordingNow(): Promise<string | null> {
  return recordingNowSchema.parse(await getPlugin().recordingNow()).recordingId;
}

/** The taps made on the notification that the page has not applied yet, oldest first. */
export async function readRideEvents(): Promise<RideEvent[]> {
  return rideEventsSchema.parse(await getPlugin().events()).events;
}

/** Forgets the taps up to `time`: the page has applied them. */
export function dropRideEvents(time: number): Promise<void> {
  return getPlugin().dropEvents({ time: Math.floor(time) });
}

/** Hears a tap on the notification while the page is awake; returns what stops hearing. */
export function onRideEvent(listener: () => void): () => void {
  const handle = getPlugin().addListener(RIDE_EVENT_NAME, listener);
  return () => {
    void handle.then((h) => h.remove());
  };
}
