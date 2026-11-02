import { isEmulatorRide } from '@/shared/config/env';

import { isNativeApp } from './native-app';
import type { RideNoticeState } from '../native/ride-notice';
import type { RideTaps } from '../recorder/ride-events';
import type { Recording } from '../storage/recording-schema';

/*
 * What the recorder asks of the app's ride notification (native/ride-notice.ts). As in
 * native-fixes.ts, the checks sit here, in the page's own code, so the web build drops the native
 * module behind them; the mode check is repeated in each function for the bundler to see it.
 *
 * In the emulator ride's build every function here does nothing. That build's driver
 * (native/emulator-ride.ts) holds the notification itself and leaves its taps to the native side,
 * as they are left while the page is asleep, and that is what emulator-notification.sh checks.
 * native-fixes.ts keeps working in that build, because its fix log is what the emulator ride is
 * there to prove.
 */

/** Tells the notification where the ride is. Nothing on the web. */
export async function tellRideNotice(state: RideNoticeState): Promise<void> {
  if (import.meta.env.MODE !== 'apk' || !isNativeApp() || isEmulatorRide) return;
  const { setRideNoticeState } = await import('../native/ride-notice');
  await setRideNoticeState(state);
}

/**
 * The taps made on the notification for `recordingId` that the page has not applied yet, folded;
 * null on the web, or when there are none.
 */
export async function readRideTaps(recordingId: string): Promise<RideTaps | null> {
  if (import.meta.env.MODE !== 'apk' || !isNativeApp() || isEmulatorRide) return null;
  const { foldUnappliedTaps } = await import('../native/apply-ride-taps');
  return foldUnappliedTaps(recordingId);
}

/**
 * The ride found open as the page opens, with the taps made on the notification while it was gone
 * applied and stored; on the web, as it was.
 */
export async function applyOpeningRideTaps(
  recording: Recording | null,
): Promise<{ recording: Recording | null; isFinished: boolean }> {
  if (import.meta.env.MODE !== 'apk' || !isNativeApp() || isEmulatorRide) {
    return { recording, isFinished: false };
  }
  const { applyOpeningTaps } = await import('../native/apply-ride-taps');
  return applyOpeningTaps(recording);
}

/** Forgets the taps up to `time`, once applied. */
export async function dropRideTaps(time: number): Promise<void> {
  if (import.meta.env.MODE !== 'apk' || !isNativeApp() || isEmulatorRide) return;
  const { dropRideEvents } = await import('../native/ride-notice');
  await dropRideEvents(time);
}

/** Hears a tap on the notification while the page is awake; returns what stops hearing. */
export function onRideTap(listener: () => void): () => void {
  if (import.meta.env.MODE !== 'apk' || !isNativeApp() || isEmulatorRide) return () => undefined;
  let stop: (() => void) | null = null;
  let isStopped = false;
  import('../native/ride-notice')
    .then(({ onRideEvent }) => {
      if (!isStopped) stop = onRideEvent(listener);
    })
    .catch((error: unknown) => {
      console.warn('The ride notification could not be heard.', error);
    });
  return () => {
    isStopped = true;
    stop?.();
  };
}
