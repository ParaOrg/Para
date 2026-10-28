import { summarize, type Fix } from '@/features/routes/model/ride-recording';

import { downloadRecording, recordingFile } from './recording-file';
import { fixOfRow } from './recording-fixes';
import type { Recording } from './recording-schema';
import { loadFixes } from './recording-store';

/** Downloads a recording from the fixes in hand, for when the phone could not keep them. */
export function downloadHeldRecording(recording: Recording, fixes: readonly Fix[]): void {
  const end = recording.stoppedAt ?? Date.now();
  const summary = summarize(fixes, recording.gaps, recording.startedAt, end);
  downloadRecording(recordingFile(recording, fixes, summary));
}

/** Downloads a recording with its fixes read back from this phone. */
export async function downloadStoredRecording(recording: Recording): Promise<void> {
  const rows = await loadFixes(recording.id);
  const recorded = rows.map(fixOfRow);
  const end = recording.stoppedAt ?? recording.savedAt ?? recording.startedAt;
  const summary = summarize(recorded, recording.gaps, recording.startedAt, end);
  downloadRecording(recordingFile(recording, recorded, summary));
}
