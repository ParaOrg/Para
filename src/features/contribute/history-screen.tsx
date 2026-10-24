import { Button } from '@/design-system/primitives/button';
import { IconButton } from '@/design-system/primitives/icon-button';
import { ChevronLeftIcon } from '@/shared/ui/route-icons';

import { HISTORY_HEADING_ID, groupRecordings } from './history-groups';
import type { Recording } from './recording-schema';
import { SavedRideRow } from './saved-ride-row';
import { useFocusHeading } from './use-focus-heading';
import type { Uploads } from './use-uploads';

interface HistoryScreenProps {
  recordings: readonly Recording[];
  uploads: Uploads;
  onBack: () => void;
  onDownload: (recording: Recording) => void;
  onDeleteFromPhone: (recording: Recording) => void;
}

/**
 * The recordings kept on this phone, on a screen of their own with no Start bar and no map
 * behind it: grouped by where their upload stands, so a card needs no label for it.
 */
export function HistoryScreen({
  recordings,
  uploads,
  onBack,
  onDownload,
  onDeleteFromPhone,
}: HistoryScreenProps) {
  const headingRef = useFocusHeading();
  const groups = groupRecordings(recordings, uploads.statusOf);

  return (
    <section
      aria-labelledby={HISTORY_HEADING_ID}
      className="absolute inset-0 z-20 flex flex-col bg-surface-secondary font-sn-pro text-content-primary"
    >
      <header className="flex items-center gap-3 pt-[max(1rem,env(safe-area-inset-top))] pr-4 pb-3 pl-[max(1rem,env(safe-area-inset-left))]">
        <IconButton
          tooltip="top"
          size="large"
          label="Back"
          icon={<ChevronLeftIcon />}
          onClick={onBack}
        />
        <h1
          id={HISTORY_HEADING_ID}
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl/8 font-extrabold focus:outline-none"
        >
          History
        </h1>
      </header>
      {groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
          <p className="text-base/6 text-content-quaternary">No recordings yet.</p>
          <Button variant="primary" label="Record a route" onClick={onBack} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {groups.map(({ group, items }) => (
            <section key={group.key} aria-labelledby={`history-${group.key}`}>
              <h2 id={`history-${group.key}`} className="pb-2 text-base/6 font-bold">
                {group.title}
              </h2>
              <ul className="flex flex-col gap-2">
                {items.map(({ recording, status }) => (
                  <SavedRideRow
                    key={recording.id}
                    recording={recording}
                    status={status}
                    canRemove={uploads.canRemove(recording)}
                    onDownload={() => onDownload(recording)}
                    onUpload={() => uploads.upload(recording)}
                    onRemoveUpload={() => uploads.removeUploaded(recording)}
                    onDeleteFromPhone={() => onDeleteFromPhone(recording)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
