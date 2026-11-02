import type { UploadStatus } from './upload-state';

/** The question before deleting the phone's copy: whether a copy stays with Para decides the words. */
export function deleteFromPhoneQuestion(status: UploadStatus): string {
  if (status.state === 'uploaded') {
    return 'Remove this recording from this phone? The copy uploaded to Para stays.';
  }
  if (status.state === 'removed' || status.state === 'unavailable') {
    return 'Remove this recording from this phone? It will be gone for good.';
  }
  return 'Remove this recording from this phone? It has not been uploaded, so it will be gone for good.';
}

export const REMOVE_UPLOAD_QUESTION =
  'Delete this recording from Para? The copy on this phone stays.';

/** The same question for an upload with no copy on this phone (sent from another): nothing stays. */
export const DELETE_ONLY_COPY_QUESTION =
  "Delete this recording from Para? There's no copy on this phone, so it will be gone for good.";
