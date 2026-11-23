import { fullDateTimeText } from '../common/format';
import type { Recording } from '../storage/recording-schema';

/** What a ride is called on its card and its screen: where it began, else its description. */
export function rideTitleOf(recording: Recording): string {
  return recording.startPointName || recording.description || 'Recording';
}

/** The ride in words, its moment and name, so a button acting on it says which one. */
export const rideFullNameOf = (recording: Recording): string =>
  `the recording of ${fullDateTimeText(recording.startedAt)}, ${rideTitleOf(recording)}`;
