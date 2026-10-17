import { useState } from 'react';

import { PageButton } from './button';
import { dayText } from './format';
import type { Recording } from './recording-schema';

interface SavedListProps {
  recordings: readonly Recording[];
  onDownload: (id: string) => void;
  onRemove: (id: string) => void;
}

/** The recordings kept on the phone, each to download or delete (after one question). */
export function SavedList({ recordings, onDownload, onRemove }: SavedListProps) {
  const [askingAbout, setAskingAbout] = useState<string | null>(null);
  if (recordings.length === 0) return <p>No saved recordings yet.</p>;
  return (
    <section aria-label="Saved recordings" className="flex flex-col gap-2">
      <h2 className="font-bold">Saved on this phone</h2>
      <ul className="flex flex-col gap-3">
        {recordings.map((recording) => (
          <li key={recording.id} className="flex flex-col gap-2 border-t pt-2">
            <p>
              {dayText(recording.startedAt)}
              {recording.rideKind ? ` · ${recording.rideKind}` : ''}
              {recording.startPointName || recording.endPointName
                ? ` · ${recording.startPointName || '?'} → ${recording.endPointName || '?'}`
                : ''}
            </p>
            {recording.failedFixWrites ? (
              <p>The phone could not keep {recording.failedFixWrites} fixes of this ride.</p>
            ) : null}
            {askingAbout === recording.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <span>Delete this recording from the phone?</span>
                <PageButton
                  onClick={() => {
                    onRemove(recording.id);
                    setAskingAbout(null);
                  }}
                >
                  Delete
                </PageButton>
                <PageButton onClick={() => setAskingAbout(null)}>Keep it</PageButton>
              </div>
            ) : (
              <div className="flex gap-2">
                <PageButton onClick={() => onDownload(recording.id)}>Download</PageButton>
                <PageButton onClick={() => setAskingAbout(recording.id)}>Delete</PageButton>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
