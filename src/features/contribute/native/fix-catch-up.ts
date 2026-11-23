import type { WatchedFix } from '../native-bridge/native-contract';

/** A silence this long between live fixes means the page slept through some: read the log. */
export const GAP_MS = 5_000;

/** Reads the native log's fixes after a time; null for all of them. */
export type ReadFixesAfter = (after: number | null) => Promise<WatchedFix[]>;

export interface FixCatchUp {
  /** Reads the log for what the recorder has not had yet; a read under way is not doubled. */
  readLog: () => void;
  /**
   * Hands one live fix on, or holds it until a read of the log has gone out first: always before
   * the first read, so the fixes the service kept before the watch began are not skipped.
   */
  handleLive: (fix: WatchedFix) => void;
}

/**
 * How the live fixes and the native log reach the recorder. The log is read for the fixes after
 * the last one handed on (all of them before the first), so a wake or a silence late in a long
 * ride brings only the missing stretch, not the whole ride. While it is being read, live fixes
 * wait and go out after it, so the recorder gets the missing stretch before anything newer. A
 * live fix before the first read waits for it too: handed on first, it would set where the read
 * starts, and the fixes logged before it (between the page's opening import and the watch's start)
 * would never reach the recorder.
 */
export function createFixCatchUp(
  readAfter: ReadFixesAfter,
  onFixes: (fixes: WatchedFix[]) => void,
): FixCatchUp {
  let lastTime: number | null = null;
  let isReading = false;
  let hasRead = false;
  let waiting: WatchedFix[] = [];

  const deliver = (fixes: WatchedFix[]) => {
    for (const fix of fixes) lastTime = Math.max(lastTime ?? 0, fix.timestamp);
    onFixes(fixes);
  };

  const readLog = () => {
    if (isReading) return;
    isReading = true;
    readAfter(lastTime)
      .catch((error: unknown) => {
        console.error('The native fix log could not be read.', error);
        return [];
      })
      .then((fromLog) => {
        isReading = false;
        hasRead = true;
        // A waiting live fix the log already holds goes out once, from the log.
        const logEnd = fromLog[fromLog.length - 1]?.timestamp ?? null;
        const merged = [
          ...fromLog,
          ...waiting.filter((fix) => logEnd === null || fix.timestamp > logEnd),
        ];
        waiting = [];
        if (merged.length > 0) deliver(merged);
      });
  };

  const handleLive = (fix: WatchedFix) => {
    const isAfterSilence = lastTime !== null && fix.timestamp - lastTime > GAP_MS;
    if (isReading || !hasRead || isAfterSilence) {
      waiting.push(fix);
      readLog();
      return;
    }
    deliver([fix]);
  };

  return { readLog, handleLive };
}
