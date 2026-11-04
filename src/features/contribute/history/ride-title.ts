import type { Recording } from '../storage/recording-schema';

/** What a ride is called on its card and its screen: where it began, else its description. */
export function rideTitleOf(recording: Recording): string {
  return recording.startPointName || recording.description || 'Recording';
}
