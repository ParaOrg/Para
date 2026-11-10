import { useEffect, type RefObject } from 'react';

import { isGoneFromPara } from './upload-rules';
import type { UploadStatus } from './upload-state';
import { currentIdentity, uploadsStillThere } from '../api/upload-contribution';
import type { Recording } from '../storage/recording-schema';
import { updateRecording } from '../storage/recording-store';

interface UploadsStillThereOptions {
  /** Whether to ask: uploads are available, there is consent, and something was uploaded. */
  shouldAsk: boolean;
  savedRef: RefObject<readonly Recording[]>;
  /** Whether a recording is being sent, or has a status from this visit. */
  isBusy: (recordingId: string) => boolean;
  setStatus: (recordingId: string, status: UploadStatus) => void;
}

/**
 * Which of this phone's uploads an editor has since deleted in the studio: those are marked
 * removed on the phone, so they can be sent again.
 */
export function useUploadsStillThere({
  shouldAsk,
  savedRef,
  isBusy,
  setStatus,
}: UploadsStillThereOptions): void {
  useEffect(() => {
    if (!shouldAsk) return;
    let isCurrent = true;
    const settle = async () => {
      const id = await currentIdentity();
      if (!isCurrent || !id) return;
      const there = await uploadsStillThere();
      for (const recording of savedRef.current) {
        if (!isGoneFromPara(recording, id, there) || isBusy(recording.id)) continue;
        await updateRecording(recording.id, (stored) => ({
          ...stored,
          upload: { state: 'removed', at: Date.now(), byEditor: true },
        }));
        if (isCurrent) setStatus(recording.id, { state: 'removed', byEditor: true });
      }
    };
    // With no signal the list stays as this phone last knew it.
    settle().catch((error: unknown) =>
      console.warn('The phone could not check its uploads.', error),
    );
    return () => {
      isCurrent = false;
    };
  }, [shouldAsk, savedRef, isBusy, setStatus]);
}
