import { useId } from 'react';

import { CardMeta } from './card-meta';
import { CardPicture } from './card-picture';
import { cardStatusOf } from './card-status';
import { CardStatusLine } from './card-status-line';
import type { RideFacts } from './ride-facts';
import { rideFullNameOf, rideTitleOf } from './ride-title';
import { ArrowRightIcon } from '../common/history-icons';
import type { Recording } from '../storage/recording-schema';
import type { UploadStatus } from '../uploads/upload-state';

interface HistoryCardProps {
  recording: Recording;
  status: UploadStatus;
  /** Its distance and trail; null until read, and for an upload the database told nothing of. */
  facts: RideFacts | null;
  /** The picture of its whole trail on the map, taken as its form opened; null for none. */
  picture: string | null;
  /** Whether the phone has a connection: queued reads "Waiting for signal" without one. */
  isOnline: boolean;
  /** A tap on the card: the ride's own screen, where it can be deleted. */
  onOpen: () => void;
  /** Tap retry upload: sends it again. */
  onRetry: () => void;
}

/**
 * Figma's HistoryCard (4518:24588): the trail's picture, where the ride began and ended, the
 * vehicle, day, time and distance, and the upload's one line. A tap on the card opens the ride's
 * screen, where anything else is done.
 */
export function HistoryCard({
  recording,
  status,
  facts,
  picture,
  isOnline,
  onOpen,
  onRetry,
}: HistoryCardProps) {
  const titleId = useId();
  const title = rideTitleOf(recording);

  return (
    // Off screen, the browser skips its layout and paint until it is scrolled near: a hundred
    // cards open as fast as a handful. It clips the card's painting to its box, so the box has
    // room for the card's shadow (shadow-sm: 12 blur, 3 down), padded and pulled back by as much.
    // 9.25rem is a card's height (Figma 4518:24588) with that room, held for it until it is first
    // drawn, then its own, so the scroll never jumps.
    <li className="-mx-4 -mt-3 -mb-4 flex flex-col px-4 pt-3 pb-4 [contain-intrinsic-size:auto_9.25rem] [content-visibility:auto]">
      <article
        aria-labelledby={titleId}
        className="relative flex rounded-2xl bg-surface font-sn-pro text-content-primary shadow-sm"
      >
        <CardPicture picture={picture} trail={facts?.trail ?? null} />
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
          <div className="flex flex-col">
            <h2 id={titleId} className="text-base/6 font-extrabold">
              {/* The whole card is its press area (the ::after over it); a retry on the status
                  line stands above it. */}
              <button
                type="button"
                data-ride-card={recording.id}
                onClick={onOpen}
                className="line-clamp-2 w-full text-left break-words after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-surface"
              >
                {title}
              </button>
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
            {/* Only a retry stands above the card's press area: a tap on the line's words
                opens the ride, as anywhere else on the card. */}
            <div className="pointer-events-none relative z-10 flex h-4 items-center [&_button]:pointer-events-auto">
              <CardStatusLine
                status={cardStatusOf(status, isOnline)}
                fullName={rideFullNameOf(recording)}
                onRetry={onRetry}
              />
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}
