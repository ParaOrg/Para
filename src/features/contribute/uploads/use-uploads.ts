import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { isWaitingToGo } from './upload-rules';
import type { UploadGate, UploadStatus } from './upload-state';
import { useUploadSending } from './use-upload-sending';
import { useUploadsStillThere } from './use-uploads-still-there';
import { accountKeys } from '../api/account-keys';
import { canUpload } from '../api/contribute-config';
import { turnstileSiteKey } from '../api/env';
import { currentIdentity } from '../api/upload-contribution';
import { UploadError } from '../api/upload-problem';
import type { Recording } from '../storage/recording-schema';

export interface Uploads {
  statusOf: (recording: Recording) => UploadStatus;
  /** Saved recordings not yet uploaded and not removed. */
  waitingCount: number;
  /** Sends one now: a retry after a failure, or again after its upload was removed. */
  upload: (recording: Recording) => void;
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
  const isAvailable = canUpload();
  const [isCheckNeeded, setIsCheckNeeded] = useState(false);
  const [checkRound, setCheckRound] = useState(0);
  const tokenRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  /**
   * The account's identity a send goes under. Never an anonymous one (CONSENT_VERSION 4: nothing
   * is sent until an account is signed in): a session gone since Supabase last said (the account
   * deleted, or signed out on another phone) has the page ask again, which shows Sign in, and the
   * recording waits on the phone.
   */
  async function identityForUpload(): Promise<string | null> {
    const known = await currentIdentity();
    if (known) return known;
    void queryClient.invalidateQueries({ queryKey: accountKeys.session() });
    throw new UploadError('signed-out', 'No account is signed in on this phone.');
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
  });
  const { statusOf } = sending;

  // Only asked once something was uploaded: the client is loaded on first need. Nothing is asked
  // of the database before consent to the current text.
  const hasUploads = saved.some((r) => r.upload?.state === 'uploaded');
  useUploadsStillThere({
    shouldAsk: isAvailable && hasUploads && gate.hasConsent,
    savedRef: sending.savedRef,
    isBusy: sending.isBusy,
    setStatus: sending.setStatus,
  });

  return {
    statusOf,
    waitingCount: saved.filter((r) => isWaitingToGo(statusOf(r))).length,
    upload: (recording) => void sending.send(recording),
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
