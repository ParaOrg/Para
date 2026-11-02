import { dropRideEvents, readRideEvents } from './ride-notice';
import type { RideTaps } from '../native-bridge/native-contract';
import { stoppedRecording } from '../recorder/recording-transitions';
import { foldRideEvents, withRideTaps } from '../recorder/ride-events';
import type { Recording } from '../storage/recording-schema';
import { putRecording } from '../storage/recording-store';

/** The taps on the notification for `recordingId` not applied yet, folded; null when none. */
export async function foldUnappliedTaps(recordingId: string): Promise<RideTaps | null> {
  const events = await readRideEvents();
  return events.length > 0 ? foldRideEvents(events, recordingId) : null;
}

/**
 * The open ride with the taps made on the notification while the page was gone: its switches,
 * its pauses, and the Stop of a pause or a Finish not yet resumed. Stored, then the taps are
 * forgotten. With no ride open, the taps have nothing to apply to and are forgotten.
 */
export async function applyOpeningTaps(
  recording: Recording | null,
): Promise<{ recording: Recording | null; isFinished: boolean }> {
  if (!recording) {
    await dropRideEvents(Date.now());
    return { recording, isFinished: false };
  }
  const taps = await foldUnappliedTaps(recording.id);
  if (!taps) return { recording, isFinished: false };
  const tapped = withRideTaps(recording, taps);
  const applied =
    tapped.stopAt === null
      ? tapped.recording
      : stoppedRecording(tapped.recording, tapped.stopAt, tapped.recording.failedFixWrites ?? 0);
  await putRecording(applied);
  await dropRideEvents(taps.lastTime);
  return { recording: applied, isFinished: tapped.isFinished };
}
