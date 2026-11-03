import { loadRecordings } from './recording-store';

/**
 * Whether a recording is open on this phone: one still being made, or stopped and not yet
 * saved. Read from what is stored, since every point is written as it arrives, so it holds
 * for every tab. The recorder lock cannot say: a tab holds it from the moment it opens, not
 * only while it records. When the phone's storage cannot be read it says yes, so an update
 * waits rather than risk a ride.
 */
export async function hasOpenRecording(): Promise<boolean> {
  try {
    const all = await loadRecordings();
    return all.some((recording) => recording.status !== 'saved');
  } catch (error) {
    console.warn('The stored recordings could not be read, so an update will wait.', error);
    return true;
  }
}
