import * as z from 'zod/mini';

/** Where this phone keeps that the "Track your routes" offer was answered. */
const KEY = 'para.contribute.track-routes-offer';

/** Tutorial or Later: either answers it, for good, on this phone. */
const answeredSchema = z.literal('answered');

/**
 * Whether the offer of the tutorial was answered on this phone. Anything else kept under its key,
 * or storage that will not answer, counts as not yet: the offer shows again.
 */
export function isTrackRoutesOfferAnswered(): boolean {
  try {
    return answeredSchema.safeParse(localStorage.getItem(KEY)).success;
  } catch (error) {
    console.warn('The phone would not say whether the tutorial was offered.', error);
    return false;
  }
}

/** Keeps that the offer was answered, so it is not made again on this phone. */
export function markTrackRoutesOfferAnswered(): void {
  try {
    localStorage.setItem(KEY, 'answered');
  } catch (error) {
    console.warn('The phone would not keep that the tutorial was offered.', error);
  }
}
