import { useEffect, useId, useRef, useState } from 'react';

import type { Asking, CardActions } from './card-menu';
import { CardMeta } from './card-meta';
import { CardPicture } from './card-picture';
import { HISTORY_HEADING_ID, cardStatusOf } from './card-status';
import { CardStatusRow } from './card-status-row';
import { ArrowRightIcon } from './history-icons';
import type { RideFacts } from './ride-facts';
import { ConfirmDelete } from '../common/confirm-delete';
import { fullDateTimeText } from '../common/format';
import type { Recording } from '../storage/recording-schema';
import type { UploadStatus } from '../uploads/upload-state';
import {
  DELETE_ONLY_COPY_QUESTION,
  REMOVE_UPLOAD_QUESTION,
  deleteFromPhoneQuestion,
} from '../uploads/upload-status';

interface HistoryCardProps {
  recording: Recording;
  status: UploadStatus;
  actions: CardActions;
  /** Its distance and trail; null until read, and for an upload the database told nothing of. */
  facts: RideFacts | null;
  /** The picture of its whole trail on the map, taken as its form opened; null for none. */
  picture: string | null;
  /** Whether the phone has a connection: queued reads "Waiting for signal" without one. */
  isOnline: boolean;
  onUpload: () => void;
  onDownload: () => void;
  onDeleteFromPara: () => void;
  onRemoveFromPhone: () => void;
}

/**
 * Figma's HistoryCard (4518:24588): the trail's picture, where the ride began and ended, the
 * vehicle, day, time and distance, and the upload's one line. ⋮ holds what else can be done, each
 * delete asked first under the card. Tapping the card itself does nothing.
 */
export function HistoryCard({
  recording,
  status,
  actions,
  facts,
  picture,
  isOnline,
  onUpload,
  onDownload,
  onDeleteFromPara,
  onRemoveFromPhone,
}: HistoryCardProps) {
  const [asking, setAsking] = useState<Asking>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const shouldReturnFocus = useRef(false);
  const titleId = useId();
  const title = recording.startPointName || recording.description || 'Recording';
  const fullName = `the recording of ${fullDateTimeText(recording.startedAt)}, ${title}`;

  // The question took the menu's place, so Keep it hands focus back to the ⋮ that led to it.
  useEffect(() => {
    if (asking || !shouldReturnFocus.current) return;
    shouldReturnFocus.current = false;
    moreRef.current?.focus();
  }, [asking]);

  const handleConfirm = () => {
    if (asking === 'delete-from-para') onDeleteFromPara();
    if (asking === 'remove-from-phone') onRemoveFromPhone();
    setAsking(null);
    // The question and, for a removal, the card are gone: History's heading is the nearest steady place.
    document.getElementById(HISTORY_HEADING_ID)?.focus();
  };

  const handleKeep = () => {
    shouldReturnFocus.current = true;
    setAsking(null);
  };

  return (
    <li className="flex flex-col gap-2">
      <article
        aria-labelledby={titleId}
        className="flex rounded-2xl bg-surface font-sn-pro text-content-primary shadow-sm"
      >
        <CardPicture picture={picture} trail={facts?.trail ?? null} />
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
          <div className="flex flex-col">
            <h2 id={titleId} className="line-clamp-2 text-base/6 font-extrabold break-words">
              {title}
            </h2>
            {recording.endPointName && (
              <p className="flex items-center gap-1 text-sm/5">
                <span aria-hidden className="size-5 shrink-0 *:size-full">
                  <ArrowRightIcon />
                </span>
                <span className="sr-only">to</span>
                <span className="line-clamp-2 min-w-0 flex-1 break-words">
                  {recording.endPointName}
                </span>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <CardMeta recording={recording} facts={facts} />
            <CardStatusRow
              status={cardStatusOf(status, actions.canDeleteFromPara, isOnline)}
              actions={actions}
              fullName={fullName}
              isAsking={asking !== null}
              moreRef={moreRef}
              onUpload={onUpload}
              onDownload={onDownload}
              onAsk={setAsking}
            />
          </div>
        </div>
      </article>
      {asking && (
        <div className="overflow-hidden rounded-2xl shadow-sm">
          <ConfirmDelete
            question={
              asking === 'remove-from-phone'
                ? deleteFromPhoneQuestion(status)
                : actions.isOnPhone
                  ? REMOVE_UPLOAD_QUESTION
                  : DELETE_ONLY_COPY_QUESTION
            }
            confirmLabel={asking === 'delete-from-para' ? 'Delete' : 'Remove'}
            onConfirm={handleConfirm}
            onKeep={handleKeep}
          />
        </div>
      )}
    </li>
  );
}
