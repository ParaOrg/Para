import * as z from 'zod/mini';

const KEY = 'para-hidden-rides';

const hiddenRidesSchema = z.array(z.guid());

/**
 * The rides deleted from History on this phone. Deleting takes the phone's copy only: one Para
 * holds would come back from the account's uploads, so its id is kept here and History leaves it
 * out. What cannot be read hides nothing.
 */
export function readHiddenRides(): ReadonlySet<string> {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === null) return new Set();
    const parsed = hiddenRidesSchema.safeParse(JSON.parse(stored));
    return new Set(parsed.success ? parsed.data : []);
  } catch (error) {
    console.warn('The phone would not say which rides were deleted from History.', error);
    return new Set();
  }
}

/** Adds a ride to the hidden ones, and gives the list as it now stands. */
export function hideRide(rideId: string): ReadonlySet<string> {
  const hidden = new Set(readHiddenRides()).add(rideId);
  try {
    localStorage.setItem(KEY, JSON.stringify([...hidden]));
  } catch (error) {
    // Hidden until History closes; an upload of it may then come back.
    console.warn('The phone would not keep that a ride was deleted from History.', error);
  }
  return hidden;
}
