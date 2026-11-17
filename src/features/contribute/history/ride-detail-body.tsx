import { useId, type RefObject } from 'react';

import { Button } from '@/design-system/primitives/button';

import type { CardStatus } from './card-status';
import { CardStatusLine } from './card-status-line';
import type { RideDetailRow } from './ride-details';
import { DeleteIcon } from '../common/history-icons';
import { StopNotesEntry } from '../stop-notes/stop-notes-entry';
import type { Recording } from '../storage/recording-schema';

interface RideDetailBodyProps {
  /** Its upload's line, as its History card shows it. */
  status: CardStatus;
  rows: readonly RideDetailRow[];
  /** Its Description and its flagged stops, as written. */
  recording: Pick<Recording, 'description' | 'marks'>;
  /** The ride in words, so the retry button says which one it sends. */
  fullName: string;
  onRetry: () => void;
  /** Mid-upload, deleting would cut it short: the button waits. */
  canDelete: boolean;
  /** Keep it hands focus back to the button that asked. */
  deleteRef: RefObject<HTMLDivElement | null>;
  onDelete: () => void;
  /** The way into the ride's Stops notes, read only; none for a ride with no flags. */
  onOpenStopNotes: () => void;
  stopNotesRef: RefObject<HTMLButtonElement | null>;
  /** Opens the ride's summary card, to share. */
  onSummary: () => void;
}

/**
 * The ride sheet's body, under its name (Figma 4569:4974): Commute Information, the upload's
 * Status its last row, the Description, read only and left out when none was written, the way into
 * the ride's Stops notes, Share ride summary (not in the frame yet) and Delete this record.
 */
export function RideDetailBody({
  status,
  rows,
  recording: { description, marks = [] },
  fullName,
  onRetry,
  canDelete,
  deleteRef,
  onDelete,
  onOpenStopNotes,
  stopNotesRef,
  onSummary,
}: RideDetailBodyProps) {
  const commuteHeadingId = useId();
  const descriptionHeadingId = useId();
  return (
    <div className="flex flex-col gap-8 px-5 pb-8">
      <section aria-labelledby={commuteHeadingId} className="flex flex-col gap-2.5">
        <h2 id={commuteHeadingId} className="text-xl/7 font-semibold">
          Commute Information
        </h2>
        <dl className="flex flex-col gap-2.5 text-sm/5 text-content-quaternary">
          {rows.map((row) => (
            <div key={row.label} className="flex">
              <dt className="w-35 shrink-0 font-medium">{row.label}</dt>
              <dd className="min-w-0 flex-1 break-words">
                {row.spoken ? (
                  <>
                    <span aria-hidden>{row.value}</span>
                    <span className="sr-only">{row.spoken}</span>
                  </>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
          <div className="flex">
            <dt className="w-35 shrink-0 font-medium">Status</dt>
            <dd className="flex min-w-0 flex-1">
              <CardStatusLine status={status} size="sheet" fullName={fullName} onRetry={onRetry} />
            </dd>
          </div>
        </dl>
      </section>
      {description.trim() !== '' && (
        <section aria-labelledby={descriptionHeadingId} className="flex flex-col gap-2">
          <h2 id={descriptionHeadingId} className="text-xl/7 font-semibold">
            Description
          </h2>
          <p className="text-sm/5 break-words whitespace-pre-line text-content-tertiary">
            {description}
          </p>
        </section>
      )}
      <StopNotesEntry count={marks.length} onOpen={onOpenStopNotes} buttonRef={stopNotesRef} />
      <div className="flex flex-col gap-3">
        <Button variant="secondary" label="Share ride summary" onClick={onSummary} />
        <div ref={deleteRef} className="flex flex-col">
          <Button
            variant="plain"
            tone="error"
            label="Delete this record"
            firstIcon={<DeleteIcon />}
            disabled={!canDelete}
            onClick={onDelete}
          />
        </div>
      </div>
    </div>
  );
}
