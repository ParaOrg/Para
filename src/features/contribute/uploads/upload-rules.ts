import type { UploadGate, UploadStatus } from './upload-state';
import { isEarlierRecording } from '../consent/consent-version';
import type { Recording } from '../storage/recording-schema';

/** Whether this recording is sent without being asked for: only under consent to the current text. */
export function isSentOnItsOwn(recording: Recording, gate: UploadGate): boolean {
  if (!gate.hasConsent) return false;
  return !isEarlierRecording(recording.consentVersion) || gate.earlier === 'send';
}

/** Where a recording's upload stands by what the phone keeps, before anything this visit did. */
export function storedUploadStatus(
  recording: Recording,
  isAvailable: boolean,
  gate: UploadGate,
): UploadStatus {
  if (recording.upload?.state === 'uploaded') return { ...recording.upload };
  if (recording.upload?.state === 'removed') {
    return { state: 'removed', byEditor: recording.upload.byEditor === true };
  }
  if (!isAvailable) return { state: 'unavailable' };
  return isSentOnItsOwn(recording, gate) ? { state: 'waiting' } : { state: 'held' };
}

/** Whether an upload still has to go: not sent yet, being sent, or failed. */
export function isWaitingToGo(status: UploadStatus): boolean {
  const { state } = status;
  return state === 'waiting' || state === 'checking' || state === 'uploading' || state === 'failed';
}

/**
 * Whether a saved recording has not reached Para: one still to go, and one held back as made
 * before the current consent text. Logging out leaves these behind on the phone, unsent.
 */
export function isNotSent(status: UploadStatus): boolean {
  return isWaitingToGo(status) || status.state === 'held';
}

/** Whether an upload this identity made is gone from Para: `there` holds the ids Para still has. */
export function isGoneFromPara(
  recording: Recording,
  identity: string,
  there: ReadonlySet<string>,
): boolean {
  const mark = recording.upload;
  return mark?.state === 'uploaded' && mark.by === identity && !there.has(recording.id);
}
