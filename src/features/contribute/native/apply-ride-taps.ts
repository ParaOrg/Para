import { dropRideEvents, readRecordingNow, readRideEvents } from './ride-notice';
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

/** The ride found open as the page opens, with the notification's taps applied. */
export interface OpeningRide {
  recording: Recording | null;
  /** Finished from the notification: it opens on its Save form. */
  isFinished: boolean;
  /** Recording still, the app's service on it while the page was gone: it opens recording. */
  isStillRecording: boolean;
}

/**
 * The open ride with the taps made on the notification while the page was gone: its switches,
 * its pauses, and the Stop of a pause or a Finish not yet resumed. Stored, then the taps are
 * forgotten. With no ride open, the taps have nothing to apply to and are forgotten. A ride still
 * recording after them is asked of the service: swiped from Recents, it went on recording.
 */
export async function applyOpeningTaps(recording: Recording | null): Promise<OpeningRide> {
  if (!recording) {
    await dropRideEvents(Date.now());
    return { recording, isFinished: false, isStillRecording: false };
  }
  const applied = await applyTaps(recording);
  const isStillRecording =
    applied.recording.status === 'recording' && (await isRecordedNow(recording.id));
  return { ...applied, isStillRecording };
}

/** Whether the service records `recordingId` now; not, when it cannot say: it opens cut off. */
async function isRecordedNow(recordingId: string): Promise<boolean> {
  try {
    return (await readRecordingNow()) === recordingId;
  } catch (error) {
    console.warn('The app could not say whether its ride is still recording.', error);
    return false;
  }
}

async function applyTaps(
  recording: Recording,
): Promise<{ recording: Recording; isFinished: boolean }> {
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
