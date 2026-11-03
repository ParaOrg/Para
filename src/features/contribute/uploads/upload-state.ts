import type { EarlierChoice } from '../consent/use-earlier-choice';

/** Where a saved recording's upload stands. */
export type UploadStatus =
  | { state: 'waiting' }
  /** Waiting for the check that a person is uploading, before this phone's first upload. */
  | { state: 'checking' }
  | { state: 'uploading' }
  | { state: 'uploaded'; at: number; by: string; problem?: string }
  /** `message` is the whole sentence; `brief` is its reason alone, for History, whose layout says the rest. */
  | { state: 'failed'; message: string; brief: string; willRetry: boolean }
  | { state: 'removing' }
  | { state: 'removed'; byEditor?: boolean }
  /** Not sent on its own: made before the current consent text, and the person kept it on the phone. */
  | { state: 'held' }
  | { state: 'unavailable' };

/** What lets a recording go: consent to the current text, and for earlier recordings the person's answer. */
export interface UploadGate {
  hasConsent: boolean;
  earlier: EarlierChoice | null;
}
