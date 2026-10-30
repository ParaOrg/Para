import { importNativeFixes } from './native-fixes';
import { holdRecorderLock } from './recorder-lock';
import type { FixRow, Recording } from '../storage/recording-schema';
import { loadFixes, loadRecordings } from '../storage/recording-store';

/** What the page finds on this phone as it opens. */
export type RecorderOpening =
  | { kind: 'other-tab' }
  | { kind: 'nothing-open' }
  | { kind: 'open'; recording: Recording; rows: FixRow[] };

interface OpeningSteps {
  /** Whether the page went away meanwhile: then nothing more is read or written. */
  isCancelled: () => boolean;
  /** Hears every recording the phone holds, as soon as they are read. */
  onListed: (all: Recording[]) => void;
  /** Hears that the app's native fix log could not be imported. */
  onNativeLogProblem: (error: unknown) => void;
}

/**
 * Takes the recorder for this tab and reads what the phone holds: the saved recordings, and the
 * one still open with the fixes the app kept for it imported. Null when the page went away
 * meanwhile. Rejects when the phone's storage cannot be read.
 */
export async function openRecorder({
  isCancelled,
  onListed,
  onNativeLogProblem,
}: OpeningSteps): Promise<RecorderOpening | null> {
  const isOurs = await holdRecorderLock();
  const all = await loadRecordings();
  if (isCancelled()) return null;
  onListed(all);
  if (!isOurs) return { kind: 'other-tab' };
  const open = all.find((r) => r.status !== 'saved') ?? null;
  if (open) {
    try {
      await importNativeFixes(open);
    } catch (error) {
      onNativeLogProblem(error);
    }
  }
  const rows = open ? await loadFixes(open.id) : [];
  if (isCancelled()) return null;
  return open ? { kind: 'open', recording: open, rows } : { kind: 'nothing-open' };
}
