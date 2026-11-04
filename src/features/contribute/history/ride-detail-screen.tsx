import { useState } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { slide, type Snap } from '@/shared/ui/sheet-gesture';

import { rideTitleOf } from './ride-title';
import { ArrowLeftIcon } from '../account/arrow-left-icon';
import { SCREEN_HASH_ATTR } from '../common/data-attributes';
import { ArrowRightIcon } from '../common/history-icons';
import { SCREENS } from '../navigation/screen-routes';
import type { Recording } from '../storage/recording-schema';

interface RideDetailScreenProps {
  /** The ride, or null while History is still finding it (a reload on its address). */
  recording: Recording | null;
  /** Back, Escape, or the sheet flicked down past its fold: History again. */
  onBack: () => void;
}

/**
 * Figma's Route Information (4558:11792): the ride's map, live under it, with the back button and
 * the map's own buttons standing on the sheet, and the sheet folded to the ride's name, where it
 * went, at its Low height. The page's one map draws behind it (contribute-page.tsx). While the
 * ride is still being found, the back button stands alone.
 */
export function RideDetailScreen({ recording, onBack }: RideDetailScreenProps) {
  // Folded, as the frame draws it: the name and where it went, the map above.
  const [snap, setSnap] = useState<Snap>('low');

  return (
    <section
      {...{ [SCREEN_HASH_ATTR]: SCREENS.ride.hash }}
      className="pointer-events-none absolute inset-0 z-20 font-sn-pro text-content-primary"
    >
      {/* Slides with the sheet's top, as the locator's buttons do (Locator), and never above
          where Middle puts it: past Middle the sheet covers it. */}
      <div
        className="absolute inset-0 transition-[translate] duration-sheet ease-enter in-data-dock-dragging:transition-none motion-reduce:transition-none"
        style={{ translate: `0 max(var(--dock-y, 100%), ${slide('middle')})` }}
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
      {recording && (
        <div className="pointer-events-auto">
          <BottomSheet
            label={`Your ride: ${rideTitleOf(recording)}`}
            testId="card"
            height={{ snap, onSnap: setSnap }}
            onClose={onBack}
            header={<RideHeader recording={recording} />}
          >
            {/* TODO: the Commute Information rows and the description (ride-detail ticket 02). */}
            {null}
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
