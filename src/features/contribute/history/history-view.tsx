import { Activity, useEffect, useRef } from 'react';

import { HistoryScreen } from './history-screen';
import { RideDetailScreen } from './ride-detail-screen';
import { useHistoryItems } from './use-history-items';
import { useTrailPicturesQuery } from './use-trail-pictures-query';
import type { Recording } from '../storage/recording-schema';
import type { Uploads } from '../uploads/use-uploads';

interface HistoryViewProps {
  recordings: readonly Recording[];
  uploads: Uploads;
  /** The ride whose screen shows in History's place, or null for History's list. */
  rideId: string | null;
  onOpenRecord: () => void;
  onOpenRide: (rideId: string) => void;
  /** The ride's Back: History, as it was left. */
  onCloseRide: () => void;
  /** The ride is not in History (deleted, or a stale address): History in its place. */
  onRideGone: () => void;
  onRemoveFromPhone: (recording: Recording) => void;
}

const NO_PICTURES: ReadonlyMap<string, string> = new Map();

/**
 * History with its data: mounted only while History or one of its rides shows, so the account's
 * uploads and the trails' pictures are read as it opens. A card with no picture draws its trail.
 * A ride's screen takes the list's place, which is kept, scrolled where it was, under it.
 */
export function HistoryView({
  recordings,
  uploads,
  rideId,
  onOpenRide,
  onCloseRide,
  onRideGone,
  ...actions
}: HistoryViewProps) {
  const pictures = useTrailPicturesQuery();
  // Pictures that could not be read are none: every card draws its trail instead.
  const known = pictures.isError ? NO_PICTURES : pictures.data;
  const items = useHistoryItems(recordings, uploads, known);
  const ride =
    rideId === null
      ? null
      : (items.recordings.find((candidate) => candidate.id === rideId) ?? null);
  // Until the account's uploads come, a ride from another phone may still be on its way.
  const isRideGone = rideId !== null && ride === null && items.load.state !== 'loading';

  // The address names no ride History has: the URL goes back to History's, outside React.
  useEffect(() => {
    if (isRideGone) onRideGone();
  }, [isRideGone, onRideGone]);

  // Back from a ride hands focus to the card that opened it, after History's own heading took it
  // as History showed again (a parent's effects run after its children's).
  const lastRideIdRef = useRef(rideId);
  useEffect(() => {
    const closed = lastRideIdRef.current;
    lastRideIdRef.current = rideId;
    if (rideId !== null || closed === null) return;
    document.querySelector<HTMLElement>(`[data-ride-card="${closed}"]`)?.focus();
  }, [rideId]);

  return (
    <>
      <Activity mode={rideId === null ? 'visible' : 'hidden'}>
        <HistoryScreen
          items={items}
          pictures={known ?? NO_PICTURES}
          onOpenRide={(recording) => onOpenRide(recording.id)}
          {...actions}
        />
      </Activity>
      {rideId !== null && !isRideGone && <RideDetailScreen recording={ride} onBack={onCloseRide} />}
    </>
  );
}
