import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { FAILED, problemOfError } from './upload-failures';
import { isSentOnItsOwn, storedUploadStatus } from './upload-rules';
import type { UploadGate, UploadStatus } from './upload-state';
import { packRecording } from '../api/pack-recording';
import { removeUpload, uploadContribution } from '../api/upload-contribution';
import { UploadError } from '../api/upload-problem';
import { sentConsentVersion } from '../consent/consent-version';
import { fixOfRow } from '../recorder/recording-fixes';
import type { Recording } from '../storage/recording-schema';
import { loadFixes, updateRecording } from '../storage/recording-store';

interface UploadSendingOptions {
  saved: readonly Recording[];
  gate: UploadGate;
  isAvailable: boolean;
  /** This phone's identity for a send, or null while the person check must come first. */
  identityForUpload: () => Promise<string | null>;
  /** Hears that a send waits on the person check; `isRefused` when its token was refused. */
  onCheckNeeded: (isRefused: boolean) => void;
  /** Hears the identity a send went under. */
  onIdentity: (identity: string) => void;
}

export interface UploadSending {
  statusOf: (recording: Recording) => UploadStatus;
  send: (recording: Recording) => Promise<void>;
  remove: (recording: Recording) => Promise<void>;
  /** Sends every recording waiting on the person check. */
  sendChecking: () => void;
  /** The saved list as the window's events read it. */
  savedRef: RefObject<readonly Recording[]>;
  /** Whether a recording is being sent or removed, or has a status from this visit. */
  isBusy: (recordingId: string) => boolean;
  setStatus: (recordingId: string, status: UploadStatus) => void;
}

/**
 * Sends saved recordings to Para and removes uploads. A recording is sent on its own when the
 * list holds it, and one that failed for a reason that passes is tried again when the phone comes
 * back online or to the front.
 */
export function useUploadSending({
  saved,
  gate,
  isAvailable,
  identityForUpload,
  onCheckNeeded,
  onIdentity,
}: UploadSendingOptions): UploadSending {
  const [overlay, setOverlay] = useState<Record<string, UploadStatus>>({});
  const inFlight = useRef(new Set<string>());
  const savedRef = useRef(saved);
  const gateRef = useRef(gate);
  const overlayRef = useRef(overlay);

  const setStatus = useCallback((id: string, status: UploadStatus) => {
    overlayRef.current = { ...overlayRef.current, [id]: status };
    setOverlay(overlayRef.current);
  }, []);

  const isBusy = useCallback(
    (id: string) => inFlight.current.has(id) || overlayRef.current[id] !== undefined,
    [],
  );

  function statusOf(recording: Recording): UploadStatus {
    return overlay[recording.id] ?? storedUploadStatus(recording, isAvailable, gate);
  }

  async function send(recording: Recording) {
    // Nothing leaves the phone without consent to the current text, whoever asks.
    if (!gateRef.current.hasConsent || inFlight.current.has(recording.id)) return;
    inFlight.current.add(recording.id);
    setStatus(recording.id, { state: 'uploading' });
    try {
      const rows = await loadFixes(recording.id);
      const packed = packRecording(
        recording,
        rows.map(fixOfRow),
        // Sent under the terms it was made with; an earlier recording the person chose to send
        // goes under today's, which having the account agrees to.
        sentConsentVersion(recording.consentVersion),
        Date.now(),
      );
      if (!packed.ok) {
        setStatus(recording.id, { state: 'failed', ...FAILED[packed.reason] });
        return;
      }
      const by = await identityForUpload();
      if (!by) {
        onCheckNeeded(false);
        setStatus(recording.id, { state: 'checking' });
        return;
      }
      onIdentity(by);
      await uploadContribution(packed.payload);
      const mark = { state: 'uploaded', at: Date.now(), by } as const;
      // The answer arrived; if keeping the mark fails, the next send answers 'already saved'.
      await updateRecording(recording.id, (stored) => ({ ...stored, upload: mark }));
      setStatus(recording.id, { ...mark });
    } catch (error) {
      if (!(error instanceof UploadError)) console.error('An upload failed.', error);
      if (problemOfError(error) === 'check-failed') {
        // The token was refused: a fresh check, then this one waits on it again.
        onCheckNeeded(true);
        setStatus(recording.id, { state: 'checking' });
      } else {
        setStatus(recording.id, { state: 'failed', ...FAILED[problemOfError(error)] });
      }
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
      const { brief } = FAILED[problemOfError(error)];
      setStatus(recording.id, { ...before, problem: `Not removed. ${brief}` });
    } finally {
      inFlight.current.delete(recording.id);
    }
  }

  function sendChecking() {
    for (const recording of savedRef.current) {
      if (overlayRef.current[recording.id]?.state === 'checking') void send(recording);
    }
  }

  // The list and the overlay as the window's events read them.
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  useEffect(() => {
    gateRef.current = { hasConsent: gate.hasConsent, earlier: gate.earlier };
  }, [gate.hasConsent, gate.earlier]);

  // A recording not tried yet is sent as soon as the list holds it: the page
  // opened, or one was just saved, or consent or the answer about earlier ones
  // arrived. A change to the list for any other reason (a delete) retries nothing.
  useEffect(() => {
    if (!isAvailable) return;
    for (const recording of saved) {
      const isNew = recording.upload === undefined && !overlayRef.current[recording.id];
      if (isNew && isSentOnItsOwn(recording, gate)) void send(recording);
    }
    // send reads only refs and setters; a new list or gate is what should send.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [saved, isAvailable, gate.hasConsent, gate.earlier]);

  // One that failed for want of signal (or the day's limit, or Para not taking
  // uploads) is tried again when the phone comes back online or the page comes
  // back to the front.
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

  return { statusOf, send, remove, sendChecking, savedRef, isBusy, setStatus };
}
