import type { UploadStatus } from './upload-state';

// Each said for more than one state, so written once.
const WAITING_FOR_SIGNAL = 'Waiting for signal';
const SENDING = 'Sending…';
const ONLY_ON_PHONE = 'Only on this phone';
const ON_ITS_WAY = 'Thanks! It’s on its way to Para.';
const KEPT_ON_PHONE = 'Kept on this phone.';
const SENDS_WHEN_ONLINE = `${KEPT_ON_PHONE} It sends when you’re online.`;

/**
 * Each upload state in words, History's card beside the "Route recorded" toast. They differ on
 * purpose: the card's is a short line that stays and changes as the upload does ("Only on this
 * phone"); the toast's is a sentence said once, at the save, of where the route goes next ("Kept on
 * this phone."). Which words show when is decided by card-status.ts and route-recorded.ts.
 */
export const UPLOAD_WORDS = {
  waiting: {
    card: { online: 'Waiting to send', offline: WAITING_FOR_SIGNAL },
    toast: { online: ON_ITS_WAY, offline: SENDS_WHEN_ONLINE },
  },
  checking: { card: SENDING, toast: ON_ITS_WAY },
  uploading: { card: SENDING, toast: ON_ITS_WAY },
  uploaded: { card: 'Uploaded', toast: ON_ITS_WAY },
  // Any other failure's card says its own brief reason (upload-failures.ts).
  failed: {
    card: { offline: WAITING_FOR_SIGNAL, retry: 'Tap retry upload' },
    toast: { online: ON_ITS_WAY, offline: SENDS_WHEN_ONLINE },
  },
  removed: {
    card: { byEditor: 'Removed by an editor', byYou: ONLY_ON_PHONE },
    toast: KEPT_ON_PHONE,
  },
  held: { card: ONLY_ON_PHONE, toast: KEPT_ON_PHONE },
  unavailable: { card: ONLY_ON_PHONE, toast: KEPT_ON_PHONE },
} as const satisfies Record<UploadStatus['state'], { card: unknown; toast: unknown }>;

/** The ride sheet's Status for one on this phone, not on Para, that can be sent (card-status.ts). */
export const TAP_TO_UPLOAD = 'Tap to upload';
