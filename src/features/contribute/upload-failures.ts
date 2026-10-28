import type { PackRefusal } from './api/pack-recording';
import { UploadError, type UploadProblem } from './api/upload-problem';

/** What a failed upload says: the whole sentence, its reason alone for History, and whether it tries again. */
export interface UploadFailure {
  message: string;
  brief: string;
  willRetry: boolean;
}

/** Each reason an upload or its packing can fail, in the contributor's words. */
export const FAILED: Record<UploadProblem | PackRefusal, UploadFailure> = {
  offline: {
    message: 'Not uploaded yet: no signal. It tries again when the phone is back online.',
    brief: 'No signal',
    willRetry: true,
  },
  'day-cap': {
    message: 'Not uploaded yet: this phone has sent 20 recordings today. It tries again later.',
    brief: '20 recordings sent today',
    willRetry: true,
  },
  refused: {
    message: "Para's checks refused this recording. It stays on this phone.",
    brief: "Refused by Para's checks",
    willRetry: false,
  },
  blocked: {
    message: 'This phone cannot upload recordings.',
    brief: 'This phone cannot upload',
    willRetry: false,
  },
  'check-failed': {
    message: 'The check that you are a person did not pass. Try again.',
    brief: 'Person check not passed',
    willRetry: false,
  },
  unavailable: {
    message: 'Uploading is not available on this page.',
    brief: 'Uploading is not available here',
    willRetry: false,
  },
  'not-accepting': {
    message:
      'Not uploaded yet: Para cannot take uploads right now. It stays on this phone. It tries again later.',
    brief: "Para isn't taking uploads now",
    willRetry: true,
  },
  'too-long': {
    message: 'Longer than 6 hours, so it cannot be uploaded. It stays on this phone.',
    brief: 'Longer than 6 hours',
    willRetry: false,
  },
  'line-too-large': {
    message: 'Too large to upload. It stays on this phone.',
    brief: 'Too large to upload',
    willRetry: false,
  },
};

/** The problem an upload error stands for; anything unknown is taken as no signal. */
export const problemOfError = (error: unknown): UploadProblem =>
  error instanceof UploadError ? error.problem : 'offline';
