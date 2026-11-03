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
  /** Whether a recording is being sent or removed, or has a status from this visit. */
  isBusy: (recordingId: string) => boolean;
  /** Hears who this phone is, or null when it is not signed in. */
  onIdentity: (identity: string | null) => void;
  setStatus: (recordingId: string, status: UploadStatus) => void;
}

/**
 * Who this phone is, so the list can say which uploads it may remove, and which of its uploads an
 * editor has since deleted in the studio: those are marked removed on the phone.
 */
export function useUploadsStillThere({
  shouldAsk,
  savedRef,
  isBusy,
  onIdentity,
  setStatus,
}: UploadsStillThereOptions): void {
  useEffect(() => {
    if (!shouldAsk) return;
    let isCurrent = true;
    const settle = async () => {
      const id = await currentIdentity();
      if (!isCurrent) return;
      onIdentity(id);
      if (!id) return;
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
  }, [shouldAsk, savedRef, isBusy, onIdentity, setStatus]);
}
