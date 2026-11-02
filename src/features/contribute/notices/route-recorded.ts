import type { PageProblem } from './page-problem';
import type { UploadStatus } from '../uploads/upload-state';

/** A toast's words: its title, and one more line. */
export interface ToastWords {
  title: string;
  body: string;
}

/** What the page says after a save, and how many saves it has said it for. */
export interface RouteRecordedGiven {
  words: ToastWords;
  /** Points the phone could not keep of this ride, as its own problem toast; null if none. */
  pointsLost: ToastWords | null;
  times: number;
}

const ON_ITS_WAY = 'Thanks! It’s on its way to Para.';
const SENDS_ONLINE = 'Kept on this phone. It sends when you’re online.';
const KEPT = 'Kept on this phone.';

/** Where the saved route's upload goes from here, by its state the moment it was saved. */
function uploadWords(status: UploadStatus, isOnline: boolean): string {
  switch (status.state) {
    // Checking: the bot check asks for its tap on Record itself (UploadCheck), then it goes.
    case 'uploading':
    case 'uploaded':
    case 'checking':
      return ON_ITS_WAY;
    // Failed: sent again by itself, as a waiting one is; History says why it failed.
    case 'waiting':
    case 'failed':
      return isOnline ? ON_ITS_WAY : SENDS_ONLINE;
    // Not sent by itself: no consent to the current terms yet, or uploads off here.
    case 'held':
    case 'unavailable':
    case 'removing':
    case 'removed':
      return KEPT;
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

/** The just-saved route's upload failed: a problem, in the failure's own plain words. */
export function uploadFailedProblem(status: UploadStatus): PageProblem | null {
  if (status.state !== 'failed') return null;
  return {
    id: 'upload-failed',
    icon: 'warning',
    title: 'Upload didn’t go through',
    body: status.message,
  };
}
