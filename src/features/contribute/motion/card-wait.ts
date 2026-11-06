/** How long, after the fold, the morph waits for the card when the start did not happen. */
export const CARD_WAIT_MS = 300;

/**
 * How long, after the fold, the morph waits for the card once Start tracking has gone. The
 * recording has begun, so the card is coming: a slow phone draws it late, and giving up at
 * CARD_WAIT_MS would play only the fold and pop the card in. The cap keeps a card that never
 * comes from holding the ghost over the page.
 */
export const STARTED_CARD_WAIT_MS = 2000;

/** How long, from the tap, the morph waits for the card before it gives up. */
export function cardWaitMs(foldMs: number, isStartGone: boolean): number {
  return foldMs + (isStartGone ? STARTED_CARD_WAIT_MS : CARD_WAIT_MS);
}
