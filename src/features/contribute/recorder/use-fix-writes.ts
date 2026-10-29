import { useCallback, useRef } from 'react';

import type { Fix } from '@/features/routes/model/ride-recording';

import { rowOfFix } from './recording-fixes';
import type { FixRow } from '../storage/recording-schema';
import { putFixes } from '../storage/recording-store';

export interface FixWrites {
  /** Writes the fixes as the recording's next rows; a write that fails is kept to try again. */
  writeFixes: (recordingId: string, fixes: readonly Fix[]) => void;
  /** Settles the writes in flight and writes again the ones that failed. Rejects when that write fails. */
  writeAllFixes: () => Promise<void>;
  /** How many fixes the phone has not kept. */
  failedFixWrites: () => number;
  /** Starts over at row `nextSeq`, with `failedCount` fixes already not kept. */
  resetFixWrites: (nextSeq: number, failedCount: number) => void;
}

/**
 * Writes a recording's fixes to the phone as they arrive. A write that fails is counted and its
 * rows kept, and `onWriteFailed` hears of it with the count so far. Save settles the writes in
 * flight and writes the failed ones again, so a late failure cannot drop a fix unnoticed.
 */
export function useFixWrites(
  onWriteFailed: (error: unknown, failedCount: number) => void,
): FixWrites {
  const nextSeq = useRef(0);
  const failed = useRef(0);
  const pending = useRef(new Set<Promise<void>>());
  const unwritten = useRef<FixRow[]>([]);

  function writeFixes(recordingId: string, fixes: readonly Fix[]) {
    const rows = fixes.map((fix) => rowOfFix(recordingId, nextSeq.current++, fix));
    const written = putFixes(rows)
      .catch((error: unknown) => {
        failed.current += rows.length;
        unwritten.current.push(...rows);
        onWriteFailed(error, failed.current);
      })
      .finally(() => pending.current.delete(written));
    pending.current.add(written);
  }

  async function writeAllFixes() {
    await Promise.allSettled([...pending.current]);
    const rows = unwritten.current;
    if (rows.length === 0) return;
    await putFixes(rows);
    failed.current = Math.max(0, failed.current - rows.length);
    unwritten.current = [];
  }

  // Stable, so the page's load can call it from an effect.
  const resetFixWrites = useCallback((seq: number, failedCount: number) => {
    nextSeq.current = seq;
    failed.current = failedCount;
    unwritten.current = [];
  }, []);

  return {
    writeFixes,
    writeAllFixes,
    failedFixWrites: () => failed.current,
    resetFixWrites,
  };
}
