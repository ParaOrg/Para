import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { IconButton } from '@/design-system/primitives/icon-button';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { CloseIcon } from '@/shared/ui/route-icons';
import { DOCK_TOP_CSS, type Snap } from '@/shared/ui/sheet-gesture';

import type { CardStatus } from './card-status';
import { RideDetailBody } from './ride-detail-body';
import { rideDetailsOf } from './ride-details';
import type { RideFacts } from './ride-facts';
import { RideHeader } from './ride-header';
import { RideStopNotes } from './ride-stop-notes';
import { rideFullNameOf, rideTitleOf } from './ride-title';
import { ArrowLeftIcon } from '../account/arrow-left-icon';
import { HandQuestion } from '../account/hand-question';
import { SCREEN_HASH_ATTR } from '../common/data-attributes';
import { useClosedWhenHidden } from '../common/use-closed-when-hidden';
import { SCREENS } from '../navigation/screen-routes';
import type { Recording } from '../storage/recording-schema';

/** The ride the screen shows, with what History knows of it. */
export interface RideDetail {
  recording: Recording;
  /** Its distance and whether it was walked, as History read them; null until read. */
  facts: RideFacts | null;
  /** Its upload's line, as its History card shows it. */
  status: CardStatus;
  /** Tap retry upload, or Tap to upload: sends it. */
  onRetry: () => void;
  /** Mid-upload, deleting would cut it short: Delete this record waits. */
  canDelete: boolean;
  /** Takes it off this phone, and out of History here; Para keeps any upload of it. */
  onDelete: () => void;
}

interface RideDetailScreenProps {
  /** The ride, or null while History is still finding it (a reload on its address). */
  ride: RideDetail | null;
  /** Back, Close or Escape: History again. A pull down rests the sheet at its fold, never leaves. */
  onBack: () => void;
}

/**
 * Figma's Route Information (4569:4933): the ride's map, live under it, with the back button and
 * the map's own buttons standing on the sheet, and the sheet folded to the ride's name, where it
 * went, at its Low height. Pulled up (4560:12422), it opens to its content's height, the map in
 * sight above it (4569:4974): Commute Information, its upload's Status among it, the Description
 * and Delete this record, asked first (4569:5015). The page's one map draws behind it
 * (contribute-page.tsx). Folded, the way out is Back; opened, Close. While the ride is still being
 * found, Back stands alone.
 */
export function RideDetailScreen({ ride, onBack }: RideDetailScreenProps) {
  // Folded, as the frame draws it: the name and where it went, the map above.
  const [snap, setSnap] = useState<Snap>('low');
  const [isAsking, setIsAsking] = useState(false);
  useClosedWhenHidden(setIsAsking, false);
  // Stops notes over the whole screen, read only: History never changes an upload's notes.
  const [isStopNotesOpen, setIsStopNotesOpen] = useState(false);
  useClosedWhenHidden(setIsStopNotesOpen, false);
  const stopNotesRef = useRef<HTMLButtonElement>(null);
  const isCovered = isAsking || isStopNotesOpen;
  const deleteRef = useRef<HTMLDivElement>(null);
  const shouldReturnFocus = useRef(false);
  const isFolded = snap === 'low';

  // Keep recording hands focus back to the button that asked.
  useEffect(() => {
    if (isAsking || !shouldReturnFocus.current) return;
    shouldReturnFocus.current = false;
    deleteRef.current?.querySelector('button')?.focus();
  }, [isAsking]);

  const closeStopNotes = () => {
    flushSync(() => setIsStopNotesOpen(false));
    stopNotesRef.current?.focus();
  };
  const handleKeep = () => {
    shouldReturnFocus.current = true;
    setIsAsking(false);
  };

  return (
    <section
      {...{ [SCREEN_HASH_ATTR]: SCREENS.ride.hash }}
      className="pointer-events-none absolute inset-0 z-20 font-sn-pro text-content-primary"
    >
      {/* Rides on the sheet's top all the way up, as the locator's buttons do (Locator's
          dockCap `top`), up to DOCK_TOP_CSS, room for it under the status bar: a sheet whose
          content fills the screen covers it, and pulled down, brings it back. Under the
          question, out of reach: its Escape and focus are the question's alone. */}
      <div
        inert={isCovered}
        data-dock-follower
        className="absolute inset-0 transition-[translate] duration-sheet ease-enter in-data-dock-dragging:transition-none motion-reduce:transition-none"
        // With no sheet yet (the ride still being found), at the map's foot.
        style={{ translate: `0 max(var(--dock-y, 100%), ${DOCK_TOP_CSS})` }}
      >
        <div className="pointer-events-auto absolute bottom-full left-[calc(1rem+env(safe-area-inset-left))] mb-4">
          <IconButton
            size="base"
            label={isFolded ? 'Back' : 'Close'}
            tooltip="bottom"
            icon={isFolded ? <ArrowLeftIcon /> : <CloseIcon />}
            onClick={onBack}
          />
        </div>
      </div>
      {ride && (
        <div inert={isCovered} className="pointer-events-auto">
          <BottomSheet
            label={`Your ride: ${rideTitleOf(ride.recording)}`}
            testId="card"
            height={{ snap, onSnap: setSnap }}
            fits
            closesOnPull={false}
            onClose={onBack}
            header={<RideHeader recording={ride.recording} />}
          >
            <RideDetailBody
              status={ride.status}
              rows={rideDetailsOf(ride.recording, ride.facts)}
              recording={ride.recording}
              fullName={rideFullNameOf(ride.recording)}
              onRetry={ride.onRetry}
              canDelete={ride.canDelete}
              deleteRef={deleteRef}
              onDelete={() => setIsAsking(true)}
              stopNotesRef={stopNotesRef}
              onOpenStopNotes={() => setIsStopNotesOpen(true)}
            />
          </BottomSheet>
        </div>
      )}
      {ride && isStopNotesOpen && (
        <RideStopNotes recording={ride.recording} onClose={closeStopNotes} />
      )}
      {ride && isAsking && (
        // Deleted, the ride is gone from History and its screen leaves by itself (history-view.tsx).
        <div className="pointer-events-auto">
          <HandQuestion
            title="You want to remove this recording?"
            text={null}
            error={null}
            confirmLabel="Delete this record"
            confirmVariant="plain-error"
            busyLabel="Delete this record"
            cancelLabel="Keep recording"
            isBusy={false}
            onConfirm={ride.onDelete}
            onCancel={handleKeep}
          />
        </div>
      )}
    </section>
  );
}
