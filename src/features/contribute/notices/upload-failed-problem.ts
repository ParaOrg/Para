import type { PageProblem } from './page-problem';
import type { UploadStatus } from '../uploads/upload-state';

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
