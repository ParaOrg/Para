import { useEffect, useRef, useState } from 'react';

import type { Fix } from '@/features/routes/model/ride-recording';

import { canUpload } from './api/contribute-client';
import { packRecording, type PackRefusal } from './api/pack-recording';
import {
  UploadError,
  currentIdentity,
  ensureSignedIn,
  removeUpload,
  uploadContribution,
  uploadsStillThere,
  type UploadProblem,
} from './api/upload-contribution';
import type { Recording } from './recording-schema';
import { loadFixes, updateRecording } from './recording-store';
import { CONSENT_VERSION } from './use-consent';

/** Where a saved recording's upload stands. */
export type UploadStatus =
  | { state: 'waiting' }
  | { state: 'uploading' }
  | { state: 'uploaded'; at: number; by: string; problem?: string }
  | { state: 'failed'; message: string; willRetry: boolean }
  | { state: 'removing' }
  | { state: 'removed'; byEditor?: boolean }
  | { state: 'unavailable' };

export interface Uploads {
  statusOf: (recording: Recording) => UploadStatus;
  /** Saved recordings not yet uploaded and not removed. */
  waitingCount: number;
  /** Sends one now: a retry after a failure, or again after its upload was removed. */
  upload: (recording: Recording) => void;
  /** Removes the uploaded copy from ParaPo. The phone's copy stays. */
  removeUploaded: (recording: Recording) => void;
  /** Whether this phone's identity made the upload, so it may remove it. */
  canRemove: (recording: Recording) => boolean;
}

const FAILED: Record<UploadProblem | PackRefusal, { message: string; willRetry: boolean }> = {
  offline: {
    message: 'Not uploaded yet: no signal. It tries again when the phone is back online.',
    willRetry: true,
  },
  'day-cap': {
    message: 'Not uploaded yet: this phone has sent 20 recordings today. It tries again later.',
    willRetry: true,
  },
  refused: {
    message: "ParaPo's checks refused this recording. It stays on this phone.",
    willRetry: false,
  },
  blocked: { message: 'This phone cannot upload recordings.', willRetry: false },
  'check-failed': {
    message: 'The check that you are a person did not pass. Try again.',
    willRetry: false,
  },
  unavailable: { message: 'Uploading is not available on this page.', willRetry: false },
  'too-long': {
    message: 'Longer than 6 hours, so it cannot be uploaded. It stays on this phone.',
    willRetry: false,
  },
  'too-many-points': {
    message: 'Too large to upload. It stays on this phone.',
    willRetry: false,
  },
  'line-too-large': {
    message: 'Too large to upload. It stays on this phone.',
    willRetry: false,
  },
};

const problemOfError = (error: unknown): UploadProblem =>
  error instanceof UploadError ? error.problem : 'offline';

const toFix = (row: { time: number; lng: number; lat: number; accuracyM: number }): Fix => ({
  time: row.time,
  at: [row.lng, row.lat],
  accuracyM: row.accuracyM,
});

/**
 * Sends saved recordings to ParaPo and remembers which arrived. A recording is
 * sent on its own when it is saved, when the page opens, and when the phone
 * comes back online or to the front; one that failed for want of signal is
 * tried again then too. The phone's copy is never deleted here.
 */
export function useUploads(saved: readonly Recording[]): Uploads {
  const [overlay, setOverlay] = useState<Record<string, UploadStatus>>({});
  const [identity, setIdentity] = useState<string | null>(null);
  const inFlight = useRef(new Set<string>());
  const savedRef = useRef(saved);
  const overlayRef = useRef(overlay);
  const isAvailable = canUpload();

  const setStatus = (id: string, status: UploadStatus) => {
    overlayRef.current = { ...overlayRef.current, [id]: status };
    setOverlay(overlayRef.current);
  };

  function statusOf(recording: Recording): UploadStatus {
    const shown = overlay[recording.id];
    if (shown) return shown;
    if (recording.upload?.state === 'uploaded') return { ...recording.upload };
    if (recording.upload?.state === 'removed') {
      return { state: 'removed', byEditor: recording.upload.byEditor === true };
    }
    return isAvailable ? { state: 'waiting' } : { state: 'unavailable' };
  }

  async function send(recording: Recording) {
    if (inFlight.current.has(recording.id)) return;
    inFlight.current.add(recording.id);
    setStatus(recording.id, { state: 'uploading' });
    try {
      const rows = await loadFixes(recording.id);
      const packed = packRecording(recording, rows.map(toFix), CONSENT_VERSION, Date.now());
      if (!packed.ok) {
        setStatus(recording.id, { state: 'failed', ...FAILED[packed.reason] });
        return;
      }
      const by = await ensureSignedIn();
      setIdentity(by);
      await uploadContribution(packed.payload);
      const mark = { state: 'uploaded', at: Date.now(), by } as const;
      // The answer arrived; if keeping the mark fails, the next send answers 'already saved'.
      await updateRecording(recording.id, (stored) => ({ ...stored, upload: mark }));
      setStatus(recording.id, { ...mark });
    } catch (error) {
      if (!(error instanceof UploadError)) console.error('An upload failed.', error);
      setStatus(recording.id, { state: 'failed', ...FAILED[problemOfError(error)] });
    } finally {
      inFlight.current.delete(recording.id);
    }
  }

  async function remove(recording: Recording) {
    const before = statusOf(recording);
    if (before.state !== 'uploaded' || inFlight.current.has(recording.id)) return;
    inFlight.current.add(recording.id);
    setStatus(recording.id, { state: 'removing' });
    try {
      await removeUpload(recording.id);
      await updateRecording(recording.id, (stored) => ({
        ...stored,
        upload: { state: 'removed', at: Date.now() },
      }));
      setStatus(recording.id, { state: 'removed' });
    } catch (error) {
      if (!(error instanceof UploadError)) console.error('Removing an upload failed.', error);
      const { message } = FAILED[problemOfError(error)];
      setStatus(recording.id, { ...before, problem: `Not removed. ${message}` });
    } finally {
      inFlight.current.delete(recording.id);
    }
  }

  // The list and the overlay as the window's events read them.
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  // A recording not tried yet is sent as soon as the list holds it: the page
  // opened, or one was just saved. A change to the list for any other reason
  // (a delete) retries nothing.
  useEffect(() => {
    if (!isAvailable) return;
    for (const recording of saved) {
      if (recording.upload === undefined && !overlayRef.current[recording.id]) void send(recording);
    }
    // send reads only refs and setters; a new list is what should send.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [saved, isAvailable]);

  // One that failed for want of signal (or the day's limit) is tried again when
  // the phone comes back online or the page comes back to the front.
  useEffect(() => {
    if (!isAvailable) return;
    const sendAgain = () => {
      for (const recording of savedRef.current) {
        const shown = overlayRef.current[recording.id];
        if (shown?.state === 'failed' && shown.willRetry) void send(recording);
      }
    };
    const handleVisible = () => {
      if (document.visibilityState === 'visible') sendAgain();
    };
    window.addEventListener('online', sendAgain);
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      window.removeEventListener('online', sendAgain);
      document.removeEventListener('visibilitychange', handleVisible);
    };
    // send reads only refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [isAvailable]);

  // Who this phone is, so the list can say which uploads it may remove, and
  // which of its uploads an editor has since deleted in the studio. Only asked
  // once something was uploaded: the client is loaded on first need.
  const hasUploads = saved.some((r) => r.upload?.state === 'uploaded');
  useEffect(() => {
    if (!isAvailable || !hasUploads) return;
    let isCurrent = true;
    const settle = async () => {
      const id = await currentIdentity();
      if (!isCurrent) return;
      setIdentity(id);
      if (!id) return;
      const there = await uploadsStillThere();
      for (const recording of savedRef.current) {
        const mark = recording.upload;
        if (mark?.state !== 'uploaded' || mark.by !== id || there.has(recording.id)) continue;
        if (inFlight.current.has(recording.id) || overlayRef.current[recording.id]) continue;
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
  }, [isAvailable, hasUploads]);

  const waitingCount = saved.filter((r) => {
    const state = statusOf(r).state;
    return state === 'waiting' || state === 'uploading' || state === 'failed';
  }).length;

  return {
    statusOf,
    waitingCount,
    upload: (recording) => void send(recording),
    removeUploaded: (recording) => void remove(recording),
    canRemove: (recording) => {
      const status = statusOf(recording);
      return status.state === 'uploaded' && identity !== null && status.by === identity;
    },
  };
}
