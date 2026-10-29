import { useRef, type RefObject } from 'react';

import type { Fix } from '@/features/routes/model/ride-recording';

import { endNativeFixes, keepsRecordingInBackground, readNativeFixes } from './native-fixes';
import type { WatchedFix } from './use-geolocation-watch';
import type { Recording } from '../storage/recording-schema';

export interface NativeFinish {
  /** A Stop is waiting for the native log; fixes after it are not part of the ride. */
  isFinishingRef: RefObject<boolean>;
  /** The native log could not be read or imported: it is kept, not cleared, when the ride is saved. */
  hasNativeLogProblemRef: RefObject<boolean>;
  /**
   * Stops the ride at `at`. In the app the fixes the service kept up to then go to `take` first,
   * so a Stop right after the screen was off loses none, then `settle` stops the recording and
   * the native log is ended: it takes no fixes past the Stop until Resume. On the web it settles.
   */
  finishNatively: (at: number, take: (kept: WatchedFix[]) => void, settle: () => void) => void;
}

/** The Stop of a ride in the app, which first reads what the native fix log holds. */
export function useNativeFinish(
  currentRef: RefObject<Recording | null>,
  fixesRef: RefObject<Fix[]>,
  reportNativeLog: (error: unknown) => void,
): NativeFinish {
  const isFinishingRef = useRef(false);
  const hasNativeLogProblemRef = useRef(false);

  function finishNatively(at: number, take: (kept: WatchedFix[]) => void, settle: () => void) {
    if (!keepsRecordingInBackground()) {
      settle();
      return;
    }
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    const id = currentRef.current?.id;
    const lastHeld = fixesRef.current[fixesRef.current.length - 1]?.time ?? null;
    const pull = id ? readNativeFixes(id, lastHeld).then(take) : Promise.resolve();
    pull
      .catch((error: unknown) => {
        hasNativeLogProblemRef.current = true;
        reportNativeLog(error);
      })
      .finally(() => {
        isFinishingRef.current = false;
        settle();
        endNativeFixes(at).catch(reportNativeLog);
      });
  }

  return { isFinishingRef, hasNativeLogProblemRef, finishNatively };
}
