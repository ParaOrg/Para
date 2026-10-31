import { useEffect, useId, useRef, useState, type ComponentType } from 'react';

import { useEscape } from '@/shared/hooks/use-escape';
import {
  BusIcon,
  EJeepIcon,
  FerryIcon,
  JeepneyIcon,
  TrainIcon,
  UvExpressIcon,
} from '@/shared/ui/route-icons';

import { CardMenu, hasMenuItems, type Asking, type CardActions } from './card-menu';
import { HISTORY_HEADING_ID, cardStatusOf } from './card-status';
import { CardStatusLine } from './card-status-line';
import { ArrowRightIcon, FootstepsIcon, MoreIcon } from './history-icons';
import type { RideFacts } from './ride-facts';
import { TrailSketch } from './trail-sketch';
import { ConfirmDelete } from '../common/confirm-delete';
import { cardDistanceText, dayText, fullDateTimeText, hoursMinutesText } from '../common/format';
import type { Recording, RideKind } from '../storage/recording-schema';
import type { UploadStatus } from '../uploads/upload-state';
import { REMOVE_UPLOAD_QUESTION, deleteFromPhoneQuestion } from '../uploads/upload-status';

/** The vehicles with an icon of their own; Tricycle and Other have none yet. */
const VEHICLE_ICONS: Partial<Record<RideKind, ComponentType>> = {
  Jeep: JeepneyIcon,
  'E-Jeep': EJeepIcon,
  'UV Express': UvExpressIcon,
  Bus: BusIcon,
  Train: TrainIcon,
  Ferry: FerryIcon,
};

interface HistoryCardProps {
  recording: Recording;
  status: UploadStatus;
  actions: CardActions;
  /** Its distance and trail; null until read, and for an upload the database told nothing of. */
  facts: RideFacts | null;
  /** The picture of its whole trail on the map, taken as its form opened; null for none. */
  picture: string | null;
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
  onUpload,
  onDownload,
  onDeleteFromPara,
  onRemoveFromPhone,
}: HistoryCardProps) {
  const [asking, setAsking] = useState<Asking>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuAreaRef = useRef<HTMLDivElement>(null);
  const shouldReturnFocus = useRef(false);
  const titleId = useId();
  const menuId = useId();
  const title = recording.startPointName || recording.description || 'Recording';
  const fullName = `the recording of ${fullDateTimeText(recording.startedAt)}, ${title}`;
  const seconds = ((recording.stoppedAt ?? recording.startedAt) - recording.startedAt) / 1000;
  const VehicleIcon = facts?.isWalkOnly
    ? FootstepsIcon
    : recording.rideKind && VEHICLE_ICONS[recording.rideKind];
  const meta = [
    dayText(recording.startedAt),
    hoursMinutesText(seconds),
    ...(facts ? [cardDistanceText(facts.distanceM)] : []),
  ];

  // The question took the menu's place, so Keep it hands focus back to the ⋮ that led to it.
  useEffect(() => {
    if (asking || !shouldReturnFocus.current) return;
    shouldReturnFocus.current = false;
    moreRef.current?.focus();
  }, [asking]);

  // A press anywhere but the menu and its ⋮ closes it, as Escape does.
  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && menuAreaRef.current?.contains(event.target)) return;
      setIsMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isMenuOpen]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    moreRef.current?.focus();
  };
  useEscape(closeMenu, isMenuOpen);

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

  const handleAsk = (question: Exclude<Asking, null>) => {
    setIsMenuOpen(false);
    setAsking(question);
  };

  const handleMenuAction = (action: () => void) => () => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <li className="flex flex-col gap-2">
      <article
        aria-labelledby={titleId}
        className="flex rounded-2xl bg-surface font-sn-pro text-content-primary shadow-sm"
      >
        <div className="w-22.75 shrink-0 overflow-hidden rounded-l-xl bg-surface-secondary">
          {picture ? (
            <img src={picture} alt="" className="size-full object-cover" />
          ) : (
            facts?.trail && <TrailSketch trail={facts.trail} />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
          <div className="flex flex-col">
            <h2 id={titleId} className="text-base/6 font-extrabold break-words">
              {title}
            </h2>
            {recording.endPointName && (
              <p className="flex items-center gap-1 text-sm/5">
                <span aria-hidden className="size-5 shrink-0 *:size-full">
                  <ArrowRightIcon />
                </span>
                <span className="sr-only">to</span>
                <span className="min-w-0 flex-1 break-words">{recording.endPointName}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-xs/4 text-content-tertiary">
              {VehicleIcon && (
                <span aria-hidden className="size-4 shrink-0 *:size-full">
                  <VehicleIcon />
                </span>
              )}
              {facts?.isWalkOnly && <span className="sr-only">Walked,</span>}
              {!facts?.isWalkOnly && recording.rideKind && (
                <span className="sr-only">{recording.rideKind},</span>
              )}
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {meta.map((text, index) => (
                  <span key={text} className="flex items-center gap-1.5 whitespace-nowrap">
                    {index > 0 && (
                      <span aria-hidden className="size-0.5 rounded-full bg-content-tertiary" />
                    )}
                    {text}
                  </span>
                ))}
              </span>
            </p>
            <div ref={menuAreaRef} className="relative flex h-4 items-center gap-2">
              <CardStatusLine
                status={cardStatusOf(status, actions.canDeleteFromPara)}
                fullName={fullName}
                onRetry={onUpload}
              />
              {hasMenuItems(actions) && (
                <button
                  ref={moreRef}
                  type="button"
                  aria-label={`More actions for ${fullName}`}
                  aria-expanded={isMenuOpen}
                  aria-controls={menuId}
                  disabled={asking !== null}
                  onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
                  className="-m-2 shrink-0 rounded-full p-2 text-content-primary disabled:text-content-disabled"
                >
                  <span aria-hidden className="block size-4 *:size-full">
                    <MoreIcon />
                  </span>
                </button>
              )}
              {isMenuOpen && (
                <CardMenu
                  actions={actions}
                  fullName={fullName}
                  menuId={menuId}
                  onUpload={handleMenuAction(onUpload)}
                  onDownload={handleMenuAction(onDownload)}
                  onAsk={handleAsk}
                />
              )}
            </div>
          </div>
        </div>
      </article>
      {asking && (
        <div className="overflow-hidden rounded-2xl shadow-sm">
          <ConfirmDelete
            question={
              asking === 'delete-from-para'
                ? REMOVE_UPLOAD_QUESTION
                : deleteFromPhoneQuestion(status)
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
