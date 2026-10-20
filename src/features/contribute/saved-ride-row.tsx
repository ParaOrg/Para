import { useState } from 'react';

import { ConfirmDelete } from './confirm-delete';
import { dateTimeText, fullDateTimeText } from './format';
import type { Recording } from './recording-schema';
import { REMOVE_UPLOAD_QUESTION, deleteFromPhoneQuestion, uploadStatusText } from './upload-status';
import type { UploadStatus } from './use-uploads';

interface SavedRideRowProps {
  recording: Recording;
  status: UploadStatus;
  canRemove: boolean;
  onDownload: () => void;
  onUpload: () => void;
  onRemoveUpload: () => void;
  onDeleteFromPhone: () => void;
}

type Asking = 'remove-upload' | 'delete-from-phone' | null;

const rideName = (r: Recording): string =>
  [r.startPointName, r.endPointName].filter(Boolean).join(' to ') || r.description;

const LINK =
  'min-h-11 shrink-0 text-content-quaternary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-primary';

/** One saved recording: when, its upload, and what can be done with it. Each delete is asked first. */
export function SavedRideRow({
  recording,
  status,
  canRemove,
  onDownload,
  onUpload,
  onRemoveUpload,
  onDeleteFromPhone,
}: SavedRideRowProps) {
  const [asking, setAsking] = useState<Asking>(null);
  const name = rideName(recording);
  const fullName = `the recording of ${fullDateTimeText(recording.startedAt)}${name ? `, ${name}` : ''}`;
  const isBusy = status.state === 'uploading' || status.state === 'removing';
  const canUploadNow = status.state === 'failed' || status.state === 'removed';

  const confirm = () => {
    if (asking === 'remove-upload') onRemoveUpload();
    if (asking === 'delete-from-phone') onDeleteFromPhone();
    setAsking(null);
  };

  return (
    <li className="border-b border-border-primary py-1 text-base/6 last:border-b-0">
      <span className="block min-w-0 truncate">
        {dateTimeText(recording.startedAt)}
        {name && ` · ${name}`}
      </span>
      <span aria-live="polite" className="block text-sm/5 text-content-quaternary">
        {uploadStatusText(status, canRemove)}
      </span>
      {asking ? (
        <ConfirmDelete
          question={
            asking === 'remove-upload' ? REMOVE_UPLOAD_QUESTION : deleteFromPhoneQuestion(status)
          }
          confirmLabel={asking === 'remove-upload' ? 'Remove' : 'Delete'}
          onConfirm={confirm}
          onKeep={() => setAsking(null)}
        />
      ) : (
        <div className="flex flex-wrap gap-x-4">
          <button
            type="button"
            aria-label={`Download ${fullName}`}
            onClick={onDownload}
            className={LINK}
          >
            Download
          </button>
          {canUploadNow && (
            <button
              type="button"
              aria-label={`Upload ${fullName}`}
              onClick={onUpload}
              className={LINK}
            >
              {status.state === 'removed' ? 'Upload again' : 'Try again'}
            </button>
          )}
          {canRemove && (
            <button
              type="button"
              aria-label={`Remove the upload of ${fullName}`}
              onClick={() => setAsking('remove-upload')}
              className={LINK}
            >
              Remove upload
            </button>
          )}
          {!isBusy && (
            <button
              type="button"
              aria-label={`Delete ${fullName} from this phone`}
              onClick={() => setAsking('delete-from-phone')}
              className={LINK}
            >
              Delete from phone
            </button>
          )}
        </div>
      )}
    </li>
  );
}
