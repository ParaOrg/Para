import { dateTimeText } from './format';
import type { Recording } from './recording-schema';

interface SavedRidesProps {
  recordings: readonly Recording[];
  onDownload: (recording: Recording) => void;
}

const rideName = (r: Recording): string =>
  [r.startPointName, r.endPointName].filter(Boolean).join(' to ') || r.description;

/**
 * The recordings saved on this phone, each with its download, so a reload does not hide them.
 * Interim until the owner's design; at contribute/13 each row gains its upload status.
 */
export function SavedRides({ recordings, onDownload }: SavedRidesProps) {
  if (recordings.length === 0) return null;
  return (
    <div className="bg-surface px-4 pt-4 font-sn-pro text-content-primary">
      <h2 id="saved-rides-heading" className="text-base/6 font-bold">
        Saved recordings
      </h2>
      <ul aria-labelledby="saved-rides-heading" className="max-h-40 overflow-y-auto">
        {recordings.map((recording) => {
          const when = dateTimeText(recording.startedAt);
          const name = rideName(recording);
          return (
            <li key={recording.id} className="flex items-center justify-between gap-2 text-base/6">
              <span className="min-w-0 truncate">
                {when}
                {name && ` · ${name}`}
              </span>
              <button
                type="button"
                aria-label={`Download the recording of ${when}`}
                onClick={() => onDownload(recording)}
                className="min-h-11 shrink-0 text-content-quaternary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-primary"
              >
                Download
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
