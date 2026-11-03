import type { UploadStatus } from '../uploads/upload-state';
import { UPLOAD_WORDS } from '../uploads/upload-words';

/** A toast's words: its title, and one more line. */
export interface ToastWords {
  title: string;
  body: string;
}

/**
 * A save the page tells of, as it stood the moment it was saved, and how many saves it has told
 * of. Its words are made where the toasts are drawn, so they load with the toasts' code and not in
 * the page's opening.
 */
export interface RouteRecordedGiven {
  /** The saved route's upload. */
  status: UploadStatus;
  /** Whether the phone had a connection. */
  isOnline: boolean;
  /** Points the phone could not keep of this ride, said as their own problem toast. */
  failedFixWrites: number;
  times: number;
}

/** Where the saved route's upload goes from here, by its state the moment it was saved. */
function uploadWords(status: UploadStatus, isOnline: boolean): string {
  switch (status.state) {
    // Checking: the bot check asks for its tap on Record itself (UploadCheck), then it goes.
    case 'uploading':
    case 'uploaded':
    case 'checking':
      return UPLOAD_WORDS[status.state].toast;
    // Failed: sent again by itself, as a waiting one is; History says why it failed.
    case 'waiting':
    case 'failed':
      return isOnline
        ? UPLOAD_WORDS[status.state].toast.online
        : UPLOAD_WORDS[status.state].toast.offline;
    // Not sent by itself: no consent to the current terms yet, or uploads off here.
    case 'held':
    case 'unavailable':
    case 'removing':
    case 'removed':
      return UPLOAD_WORDS[status.state].toast;
  }
}

/** "Route recorded", with where the route goes next. */
export function routeRecordedWords(status: UploadStatus, isOnline: boolean): ToastWords {
  return { title: 'Route recorded', body: uploadWords(status, isOnline) };
}

/** The points of the ride the phone could not keep, as a problem; null when it kept them all. */
export function pointsLostWords(failedFixWrites: number): ToastWords | null {
  if (failedFixWrites <= 0) return null;
  const points = failedFixWrites === 1 ? '1 point' : `${failedFixWrites} points`;
  return {
    title: 'Part of the ride wasn’t kept',
    body: `The phone couldn’t keep ${points} of this recording.`,
  };
}
