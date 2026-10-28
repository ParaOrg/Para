import { useRef, useState } from 'react';

import { canUpload } from './api/contribute-client';
import { turnstileSiteKey } from './api/env';
import { currentIdentity, ensureSignedIn } from './api/upload-contribution';
import type { Recording } from './recording-schema';
import { isWaitingToGo } from './upload-rules';
import type { UploadGate, UploadStatus } from './upload-state';
import { useUploadSending } from './use-upload-sending';
import { useUploadsStillThere } from './use-uploads-still-there';

export interface Uploads {
  statusOf: (recording: Recording) => UploadStatus;
  /** Saved recordings not yet uploaded and not removed. */
  waitingCount: number;
  /** Sends one now: a retry after a failure, or again after its upload was removed. */
  upload: (recording: Recording) => void;
  /** Removes the uploaded copy from Para. The phone's copy stays. Settles whether or not it worked. */
  removeUploaded: (recording: Recording) => Promise<void>;
  /** Whether this phone's identity made the upload, so it may remove it. */
  canRemove: (recording: Recording) => boolean;
  /** The bot check before this phone's first upload, while one is needed. */
  check: UploadCheck | null;
}

export interface UploadCheck {
  siteKey: string;
  /** Bumped for a fresh widget after a refused check. */
  round: number;
  onToken: (token: string | null) => void;
}

/**
 * Sends saved recordings to Para and remembers which arrived. A recording is
 * sent on its own when it is saved, when the page opens, and when the phone
 * comes back online or to the front; one that failed for want of signal is
 * tried again then too. The phone's copy is never deleted here.
 */
export function useUploads(saved: readonly Recording[], gate: UploadGate): Uploads {
  const [identity, setIdentity] = useState<string | null>(null);
  const isAvailable = canUpload();
  const [isCheckNeeded, setIsCheckNeeded] = useState(false);
  const [checkRound, setCheckRound] = useState(0);
  const tokenRef = useRef<string | null>(null);
  const signingIn = useRef<Promise<string> | null>(null);

  /**
   * This phone's identity, signing in once for every send waiting on it. Null
   * when the first sign-in needs the bot check and no token is in hand yet.
   */
  async function identityForUpload(): Promise<string | null> {
    if (signingIn.current) return signingIn.current;
    const known = await currentIdentity();
    if (known) return known;
    if (signingIn.current) return signingIn.current;
    if (turnstileSiteKey && !tokenRef.current) return null;
    const token = tokenRef.current ?? undefined;
    tokenRef.current = null;
    signingIn.current = ensureSignedIn(token).finally(() => {
      signingIn.current = null;
    });
    return signingIn.current;
  }

  const sending = useUploadSending({
    saved,
    gate,
    isAvailable,
    identityForUpload,
    onCheckNeeded: (isRefused) => {
      if (isRefused) setCheckRound((round) => round + 1);
      setIsCheckNeeded(true);
    },
    onIdentity: setIdentity,
  });
  const { statusOf } = sending;

  // Only asked once something was uploaded: the client is loaded on first need. Nothing is asked
  // of the database before consent to the current text.
  const hasUploads = saved.some((r) => r.upload?.state === 'uploaded');
  useUploadsStillThere({
    shouldAsk: isAvailable && hasUploads && gate.hasConsent,
    savedRef: sending.savedRef,
    isBusy: sending.isBusy,
    onIdentity: setIdentity,
    setStatus: sending.setStatus,
  });

  return {
    statusOf,
    waitingCount: saved.filter((r) => isWaitingToGo(statusOf(r))).length,
    upload: (recording) => void sending.send(recording),
    removeUploaded: (recording) => sending.remove(recording),
    canRemove: (recording) => {
      const status = statusOf(recording);
      return status.state === 'uploaded' && identity !== null && status.by === identity;
    },
    check:
      turnstileSiteKey && isCheckNeeded
        ? {
            siteKey: turnstileSiteKey,
            round: checkRound,
            onToken: (token) => {
              tokenRef.current = token;
              if (!token) return;
              setIsCheckNeeded(false);
              sending.sendChecking();
            },
          }
        : null,
  };
}
