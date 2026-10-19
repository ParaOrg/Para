import type { Recording } from './recording-schema';
import { SavedRideRow } from './saved-ride-row';
import type { Uploads } from './use-uploads';

interface SavedRidesProps {
  recordings: readonly Recording[];
  uploads: Uploads;
  onDownload: (recording: Recording) => void;
  onDeleteFromPhone: (recording: Recording) => void;
}

/**
 * The recordings saved on this phone, each with its upload, so a reload hides nothing.
 * Provisional layout until the owner's design.
 */
export function SavedRides({
  recordings,
  uploads,
  onDownload,
  onDeleteFromPhone,
}: SavedRidesProps) {
  if (recordings.length === 0) return null;
  const { waitingCount } = uploads;
  return (
    <div className="bg-surface px-4 pt-4 font-sn-pro text-content-primary">
      <h2 id="saved-rides-heading" className="text-base/6 font-bold">
        Saved recordings
        {waitingCount > 0 && (
          <span className="font-normal text-content-quaternary">
            {' '}
            · {waitingCount} not uploaded yet
          </span>
        )}
      </h2>
      <ul aria-labelledby="saved-rides-heading" className="max-h-64 overflow-y-auto">
        {recordings.map((recording) => (
          <SavedRideRow
            key={recording.id}
            recording={recording}
            status={uploads.statusOf(recording)}
            canRemove={uploads.canRemove(recording)}
            onDownload={() => onDownload(recording)}
            onUpload={() => uploads.upload(recording)}
            onRemoveUpload={() => uploads.removeUploaded(recording)}
            onDeleteFromPhone={() => onDeleteFromPhone(recording)}
          />
        ))}
      </ul>
    </div>
  );
}
