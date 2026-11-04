import { Activity, useEffect, useRef, useState } from 'react';

import { isMidUpload, rideStatusOf } from './card-status';
import { HistoryScreen } from './history-screen';
import { RideDetailScreen, type RideDetail } from './ride-detail-screen';
import { useHistoryItems } from './use-history-items';
import { useIsOnline } from './use-is-online';
import { useTrailPicturesQuery } from './use-trail-pictures-query';
import { hideRide, readHiddenRides } from '../storage/hidden-rides';
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
  /** Deletes the recording's copy on this phone. */
  onDeleteFromPhone: (recording: Recording) => void;
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
  onOpenRecord,
  onOpenRide,
  onCloseRide,
  onRideGone,
  onDeleteFromPhone,
}: HistoryViewProps) {
  const pictures = useTrailPicturesQuery();
  // Pictures that could not be read are none: every card draws its trail instead.
  const known = pictures.isError ? NO_PICTURES : pictures.data;
  const [hidden, setHidden] = useState(readHiddenRides);
  const items = useHistoryItems(recordings, uploads, known, hidden);
  const ride =
    rideId === null
      ? null
      : (items.recordings.find((candidate) => candidate.id === rideId) ?? null);
  const isOnline = useIsOnline();
  const rideStatus = ride && items.uploads.statusOf(ride);
  const detail: RideDetail | null = ride &&
    rideStatus && {
      recording: ride,
      facts: items.factsOf(ride),
      status: rideStatusOf(rideStatus, isOnline),
      onRetry: () => uploads.upload(ride),
      canDelete: !isMidUpload(rideStatus),
      // Hidden as well as deleted: Para keeps any upload of it, which would come back from the
      // account's uploads. Gone from History, its screen leaves by the effect below, once.
      onDelete: () => {
        setHidden(hideRide(ride.id));
        if (items.isOnPhone(ride)) onDeleteFromPhone(ride);
      },
    };
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
          onOpenRecord={onOpenRecord}
          onOpenRide={(recording) => onOpenRide(recording.id)}
        />
      </Activity>
      {rideId !== null && !isRideGone && <RideDetailScreen ride={detail} onBack={onCloseRide} />}
    </>
  );
}
