import { isEmulatorRide } from '@/shared/config/env';

import { isNativeApp } from './native-app';
import type { RideNoticeState, RideTaps } from './native-contract';
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
 * What the phone's ride holds for `recordingId` (its switches, gaps and Stop), for the page to
 * apply; null on the web, or when the phone holds another ride or none.
 */
export async function readRideTaps(recordingId: string): Promise<RideTaps | null> {
  if (import.meta.env.MODE !== 'apk' || !isNativeApp() || isEmulatorRide) return null;
  const { readNativeTaps } = await import('../native/apply-ride-taps');
  return readNativeTaps(recordingId);
}

/**
 * The ride found open as the page opens, with what the phone did to it while the page was gone
 * applied and stored, and whether the app's service still records it; on the web, as it was.
 */
export async function applyOpeningRideTaps(
  recording: Recording | null,
): Promise<{ recording: Recording | null; isFinished: boolean; isStillRecording: boolean }> {
  if (import.meta.env.MODE !== 'apk' || !isNativeApp() || isEmulatorRide) {
    return { recording, isFinished: false, isStillRecording: false };
  }
  const { applyOpeningTaps } = await import('../native/apply-ride-taps');
  return applyOpeningTaps(recording);
}

/** Hears the ride change on the phone while the page is awake; returns what stops hearing. */
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
