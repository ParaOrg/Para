import type { UploadStatus } from './use-uploads';

/** A saved recording's upload, in the contributor's words. */
export function uploadStatusText(status: UploadStatus, canRemove: boolean): string {
  switch (status.state) {
    case 'waiting':
      return 'Waiting to upload';
    case 'uploading':
      return 'Uploading…';
    case 'uploaded': {
      const where = canRemove
        ? 'Uploaded to ParaPo'
        : 'Uploaded from an earlier sign-in on this phone, so it cannot be removed from here';
      return status.problem ? `${where}. ${status.problem}` : where;
    }
    case 'failed':
      return status.message;
    case 'removing':
      return 'Removing the upload…';
    case 'removed':
      return status.byEditor
        ? 'Removed from ParaPo by an editor. Kept on this phone'
        : 'Upload removed. Kept on this phone';
    case 'unavailable':
      return 'Kept on this phone';
  }
}

/** The question before deleting the phone's copy: whether a copy stays with ParaPo decides the words. */
export function deleteFromPhoneQuestion(status: UploadStatus): string {
  if (status.state === 'uploaded') {
    return 'Delete this recording from this phone? The copy uploaded to ParaPo stays.';
  }
  if (status.state === 'removed' || status.state === 'unavailable') {
    return 'Delete this recording from this phone? It will be gone for good.';
  }
  return 'Delete this recording from this phone? It has not been uploaded, so it will be gone for good.';
}

export const REMOVE_UPLOAD_QUESTION =
  'Remove this recording from ParaPo? The copy on this phone stays.';
