import { FAILED } from '../uploads/upload-failures';
import type { UploadStatus } from '../uploads/upload-state';
import { TAP_TO_UPLOAD, UPLOAD_WORDS } from '../uploads/upload-words';

/** The id of History's heading, which focus returns to after a card is deleted from it. */
export const HISTORY_HEADING_ID = 'history-heading';

/**
 * How a card's status line looks: uploaded in green with a tick; a failure worth retrying in
 * Figma's orange with the turning arrows, the line being the button; a problem no retry mends in
 * red; everything else plain grey.
 */
export type CardStatusTone = 'uploaded' | 'retry' | 'quiet' | 'problem';

export interface CardStatus {
  tone: CardStatusTone;
  /** What the line says: Uploaded, Tap retry upload, Waiting for signal, Sending…, … */
  words: string;
}

const NEVER_FITS = new Set([FAILED['too-long'].brief, FAILED['line-too-large'].brief]);

/**
 * The one line every card shows about its upload. A retry only for a true failure: one the page
 * will not try again by itself. A failure it will retry is waiting: for signal, or for the reason it gives.
 */
export function cardStatusOf(status: UploadStatus, isOnline: boolean): CardStatus {
  switch (status.state) {
    case 'waiting':
      // Queued: for the signal when the phone has none, else for its turn.
      return {
        tone: 'quiet',
        words: isOnline ? UPLOAD_WORDS.waiting.card.online : UPLOAD_WORDS.waiting.card.offline,
      };
    case 'checking':
    case 'uploading':
      return { tone: 'quiet', words: UPLOAD_WORDS[status.state].card };
    case 'failed':
      if (status.willRetry) {
        return {
          tone: 'quiet',
          words:
            status.brief === FAILED.offline.brief ? UPLOAD_WORDS.failed.card.offline : status.brief,
        };
      }
      // Too long or too large never fits, however often it is sent: no retry to offer.
      return NEVER_FITS.has(status.brief)
        ? { tone: 'problem', words: status.brief }
        : { tone: 'retry', words: UPLOAD_WORDS.failed.card.retry };
    case 'uploaded':
      return { tone: 'uploaded', words: UPLOAD_WORDS.uploaded.card };
    case 'removed':
      return status.byEditor
        ? { tone: 'quiet', words: UPLOAD_WORDS.removed.card.byEditor }
        : { tone: 'quiet', words: UPLOAD_WORDS.removed.card.byYou };
    case 'held':
    case 'unavailable':
      return { tone: 'quiet', words: UPLOAD_WORDS[status.state].card };
  }
}

/** Mid-upload: deleting the phone's copy now would cut the upload short. */
export const isMidUpload = (status: UploadStatus): boolean =>
  status.state === 'checking' || status.state === 'uploading';

/** Whether a recording on this phone that is not on Para can be sent: kept back, or taken off Para. */
const canUploadAgain = (status: UploadStatus): boolean =>
  status.state === 'held' || status.state === 'removed';

/**
 * The ride sheet's Status row: the card's line, except that one not on Para which can be sent
 * reads Tap to upload, the line its button, as a retry's is.
 */
export function rideStatusOf(status: UploadStatus, isOnline: boolean): CardStatus {
  return canUploadAgain(status)
    ? { tone: 'retry', words: TAP_TO_UPLOAD }
    : cardStatusOf(status, isOnline);
}
