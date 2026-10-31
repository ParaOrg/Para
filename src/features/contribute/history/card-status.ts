import { FAILED } from '../uploads/upload-failures';
import type { UploadStatus } from '../uploads/upload-state';

/** The id of History's heading, which focus returns to after a card is deleted from it. */
export const HISTORY_HEADING_ID = 'history-heading';

/**
 * How a card's status line looks: uploaded in green with a tick, a failure in the retry colour
 * with the turning arrows (the line is the button), and everything else plain grey.
 */
export type CardStatusTone = 'uploaded' | 'retry' | 'quiet' | 'problem';

export interface CardStatus {
  tone: CardStatusTone;
  /** What the line says: Uploaded, Tap retry upload, Waiting for signal, Sending…, … */
  words: string;
}

const NEVER_FITS = new Set([FAILED['too-long'].brief, FAILED['line-too-large'].brief]);

/**
 * The one line every card shows about its upload. Red with a retry only for a true failure: one
 * the page will not try again by itself. A failure it will retry is waiting: for signal, or for the reason it gives.
 */
export function cardStatusOf(status: UploadStatus, canDeleteFromPara: boolean): CardStatus {
  switch (status.state) {
    case 'waiting':
      return { tone: 'quiet', words: 'Waiting for signal' };
    case 'checking':
    case 'uploading':
      return { tone: 'quiet', words: 'Sending…' };
    case 'removing':
      return { tone: 'quiet', words: 'Removing…' };
    case 'failed':
      if (status.willRetry) {
        return {
          tone: 'quiet',
          words: status.brief === FAILED.offline.brief ? 'Waiting for signal' : status.brief,
        };
      }
      // Too long or too large never fits, however often it is sent: no retry to offer.
      return NEVER_FITS.has(status.brief)
        ? { tone: 'problem', words: status.brief }
        : { tone: 'retry', words: 'Tap retry upload' };
    case 'uploaded':
      if (status.problem) return { tone: 'problem', words: status.problem };
      // Sent under an identity this phone no longer has: it says why it cannot be deleted here.
      return canDeleteFromPara
        ? { tone: 'uploaded', words: 'Uploaded' }
        : { tone: 'uploaded', words: 'Uploaded from an earlier sign-in' };
    case 'removed':
      return status.byEditor
        ? { tone: 'quiet', words: 'Removed by an editor' }
        : { tone: 'quiet', words: 'Only on this phone' };
    case 'held':
    case 'unavailable':
      return { tone: 'quiet', words: 'Only on this phone' };
  }
}

/** Whether the recording can be sent from its card's menu: kept back, or taken off Para. */
export const canUploadFromMenu = (status: UploadStatus): boolean =>
  status.state === 'held' || status.state === 'removed';
