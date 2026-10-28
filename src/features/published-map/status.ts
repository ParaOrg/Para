import { useCallback, useSyncExternalStore } from 'react';

import { fetchIndex, indexIsStale } from '@/features/routes/published/fetch-index';
import { noop } from '@/shared/utils/noop';

/**
 * How the public map knows its own state: whether there is a network, and
 * how old the map on screen is — what the offline notice says (Notices.tsx).
 */

/** Whether the browser believes it has a network; `false` is certain, `true` only hopeful. */
export function useOffline(): boolean {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener('online', notify);
      window.addEventListener('offline', notify);
      return () => {
        window.removeEventListener('online', notify);
        window.removeEventListener('offline', notify);
      };
    },
    () => !navigator.onLine,
    () => false,
  );
}

/**
 * When the map on screen was published, and whether it came from a stored
 * copy, from the file both hooks already share. Read again whenever the
 * routes load (`loaded`, their list), so a first load that failed and a "Try
 * again" that worked do not leave the notice saying "Offline" with no date:
 * a new `loaded` is a new subscription, and each subscription reads the
 * index again (watchMapAge).
 */
export function useMapAge(loaded: unknown): MapAge {
  // `loaded` is the reason to subscribe again, not something the callback reads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subscribe = useCallback((notify: () => void) => watchMapAge(notify), [loaded]);
  return useSyncExternalStore(
    subscribe,
    () => mapAge,
    () => NO_AGE,
  );
}

const NO_AGE: MapAge = { publishedAt: null, stale: false };
let mapAge = NO_AGE;
/** The fetchIndex() read the age last came from: the same promise says nothing new. */
let lastRead: Promise<unknown> | null = null;
const ageListeners = new Set<() => void>();

/** Tells `notify` of every new age, after reading the shared index once more. */
function watchMapAge(notify: () => void): () => void {
  ageListeners.add(notify);
  const read = fetchIndex();
  if (read !== lastRead) {
    lastRead = read;
    read.then((file) => {
      const now = sameAge(mapAge, { publishedAt: file.publishedAt, stale: indexIsStale() });
      if (now === mapAge) return;
      mapAge = now;
      for (const listener of ageListeners) listener();
    }, noop);
  }
  return () => {
    ageListeners.delete(notify);
  };
}

/** When the map on screen was published, and whether it is a stored copy. */
interface MapAge {
  publishedAt: string | null;
  stale: boolean;
}

/**
 * `now`, or `was` when it says the same. The public map hands useMapAge its
 * directions, which are a new list at every full line read, and each read
 * would set a new age with the same date: one more render of the whole app
 * per line. Kept, the state is unchanged and React renders nothing; still read
 * again each time, so a load that changes the date or the copy is shown.
 */
export function sameAge(was: MapAge, now: MapAge): MapAge {
  return was.publishedAt === now.publishedAt && was.stale === now.stale ? was : now;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "14 Sep", in the phone's own time zone; spelled by hand so every browser agrees. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
