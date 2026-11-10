import { readRideNow } from './ride-notice';
import {
  RIDE_CUT_OFF_TROUBLES,
  type RideNow,
  type RideTaps,
} from '../native-bridge/native-contract';
import { stoppedRecording } from '../recorder/recording-transitions';
import { tapsOfNativeRide, withRideTaps } from '../recorder/ride-taps';
import type { Recording } from '../storage/recording-schema';
import { putRecording } from '../storage/recording-store';

/** What the phone's ride holds for `recordingId` that the page may not have yet; null when none. */
export async function readNativeTaps(recordingId: string): Promise<RideTaps | null> {
  return tapsOfNativeRide((await readRideNow()).ride, recordingId);
}

/** The ride found open as the page opens, with the phone's taps applied. */
export interface OpeningRide {
  recording: Recording | null;
  /** Finished from the notification: it opens on its Save form. */
  isFinished: boolean;
  /** Recording still, the app's service on it while the page was gone: it opens recording. */
  isStillRecording: boolean;
}

/**
 * The open ride with what the phone did to it while the page was gone: its switches, its pauses,
 * and the Stop of a pause or a Finish not yet resumed. Stored. A ride still recording after them is
 * one the phone's service records now: swiped from Recents, it went on recording.
 */
export async function applyOpeningTaps(recording: Recording | null): Promise<OpeningRide> {
  if (!recording) return { recording, isFinished: false, isStillRecording: false };
  const now = await readRideNow();
  const applied = await applyTaps(recording, tapsOfNativeRide(now.ride, recording.id));
  const isStillRecording =
    applied.recording.status === 'recording' && isRecordedNow(now, recording.id);
  return { ...applied, isStillRecording };
}

/** Whether the phone's service records `recordingId` now: not cut off, and running. */
function isRecordedNow({ ride, isServiceRunning }: RideNow, recordingId: string): boolean {
  const isCutOff = (RIDE_CUT_OFF_TROUBLES as readonly string[]).includes(ride.trouble);
  return (
    isServiceRunning && ride.phase === 'recording' && !isCutOff && ride.recordingId === recordingId
  );
}

async function applyTaps(
  recording: Recording,
  taps: RideTaps | null,
): Promise<{ recording: Recording; isFinished: boolean }> {
  if (!taps) return { recording, isFinished: false };
  const tapped = withRideTaps(recording, taps);
  const applied =
    tapped.stopAt === null
      ? tapped.recording
      : stoppedRecording(tapped.recording, tapped.stopAt, tapped.recording.failedFixWrites ?? 0);
  await putRecording(applied);
  return { recording: applied, isFinished: tapped.isFinished };
}
