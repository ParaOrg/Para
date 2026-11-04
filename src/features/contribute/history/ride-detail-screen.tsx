import { useState } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { DOCK_TOP_CSS, type Snap } from '@/shared/ui/sheet-gesture';

import type { CardStatus } from './card-status';
import { RideDetailBody } from './ride-detail-body';
import { rideDetailsOf } from './ride-details';
import type { RideFacts } from './ride-facts';
import { rideFullNameOf, rideTitleOf } from './ride-title';
import { ArrowLeftIcon } from '../account/arrow-left-icon';
import { SCREEN_HASH_ATTR } from '../common/data-attributes';
import { ArrowRightIcon } from '../common/history-icons';
import { SCREENS } from '../navigation/screen-routes';
import type { Recording } from '../storage/recording-schema';

/** The ride the screen shows, with what History knows of it. */
export interface RideDetail {
  recording: Recording;
  /** Its distance and whether it was walked, as History read them; null until read. */
  facts: RideFacts | null;
  /** Its upload's line, as its History card shows it. */
  status: CardStatus;
  /** Tap retry upload: sends it again. */
  onRetry: () => void;
}

interface RideDetailScreenProps {
  /** The ride, or null while History is still finding it (a reload on its address). */
  ride: RideDetail | null;
  /** Back, Escape, or the sheet flicked down past its fold: History again. */
  onBack: () => void;
}

/**
 * Figma's Route Information (4558:11792): the ride's map, live under it, with the back button and
 * the map's own buttons standing on the sheet, and the sheet folded to the ride's name, where it
 * went, at its Low height. Pulled up (4560:12422), it opens to its content's height, the map in
 * sight above it: Commute Information, its upload's Status among it, and the Description. The page's one map draws behind it (contribute-page.tsx).
 * While the ride is still being found, the back button stands alone.
 */
export function RideDetailScreen({ ride, onBack }: RideDetailScreenProps) {
  // Folded, as the frame draws it: the name and where it went, the map above.
  const [snap, setSnap] = useState<Snap>('low');

  return (
    <section
      {...{ [SCREEN_HASH_ATTR]: SCREENS.ride.hash }}
      className="pointer-events-none absolute inset-0 z-20 font-sn-pro text-content-primary"
    >
      {/* Rides on the sheet's top all the way up, as the locator's buttons do (Locator's
          dockCap `top`), up to DOCK_TOP_CSS, room for it under the status bar: a sheet whose content fills the
          screen covers it, and pulled down, brings it back. */}
      <div
        className="absolute inset-0 transition-[translate] duration-sheet ease-enter in-data-dock-dragging:transition-none motion-reduce:transition-none"
        // With no sheet yet (the ride still being found), at the map's foot.
        style={{ translate: `0 max(var(--dock-y, 100%), ${DOCK_TOP_CSS})` }}
      >
        <div className="pointer-events-auto absolute bottom-full left-[calc(1rem+env(safe-area-inset-left))] mb-4">
          <IconButton
            size="base"
            label="Back"
            tooltip="bottom"
            icon={<ArrowLeftIcon />}
            onClick={onBack}
          />
        </div>
      </div>
      {ride && (
        <div className="pointer-events-auto">
          <BottomSheet
            label={`Your ride: ${rideTitleOf(ride.recording)}`}
            testId="card"
            height={{ snap, onSnap: setSnap }}
            fits
            onClose={onBack}
            header={<RideHeader recording={ride.recording} />}
          >
            <RideDetailBody
              status={ride.status}
              rows={rideDetailsOf(ride.recording, ride.facts)}
              description={ride.recording.description}
              fullName={rideFullNameOf(ride.recording)}
              onRetry={ride.onRetry}
            />
          </BottomSheet>
        </div>
      )}
    </section>
  );
}

interface RideHeaderProps {
  recording: Recording;
}

/** The sheet's head: the ride's name, and where it went after the arrow. */
function RideHeader({ recording }: RideHeaderProps) {
  return (
    <div className="flex flex-col gap-1 px-5 pt-1 pb-8">
      <h1 className="text-2xl/8 font-semibold break-words">{rideTitleOf(recording)}</h1>
      {recording.endPointName && (
        <p className="flex items-center gap-2 text-xl/7 font-medium text-content-quaternary">
          <span aria-hidden className="size-7 shrink-0 *:size-full">
            <ArrowRightIcon />
          </span>
          <span className="sr-only">to</span>
          <span className="min-w-0 flex-1 break-words">{recording.endPointName}</span>
        </p>
      )}
    </div>
  );
}
