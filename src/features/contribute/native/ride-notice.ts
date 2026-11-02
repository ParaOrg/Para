import { lazyPlugin } from '../native-bridge/native-app';
import {
  PLUGIN_NAMES,
  rideEventsSchema,
  RIDE_EVENT_NAME,
  type RideEvent,
  type RideNoticeState,
  type RideState,
} from '../native-bridge/native-contract';

interface RidePlugin {
  setState: (state: RideState) => Promise<void>;
  events: () => Promise<unknown>;
  dropEvents: (options: { time: number }) => Promise<void>;
  addListener: (
    event: typeof RIDE_EVENT_NAME,
    listener: () => void,
  ) => Promise<{ remove: () => Promise<void> }>;
}

const getPlugin = lazyPlugin<RidePlugin>(PLUGIN_NAMES.ride);

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
