import { backMove, type BackMove } from './card-stack';
import { useBackCloses } from './use-back-closes';

/** What useCardStack says of the cards, and their own buttons' moves. */
interface Cards {
  choosing: boolean;
  tripBehind: boolean;
  closeAll: () => void;
  closeHotspot: () => void;
  backToTrip: (() => void) | null;
}

/**
 * The page's wrap for ‹ and ✕ (the locator's useGazeHush), typed by its shape so routes never
 * imports the locator: a move it wraps hushes the dot's gaze, and no move stays none.
 */
export interface Hush {
  (go: () => void): () => void;
  (go: (() => void) | null): (() => void) | null;
}

/** What else Back answers to, beside the cards (RouteCardsOptions'). */
interface BackOptions {
  /** False: Back leaves the cards alone and goes where it would with none open. */
  isActive: boolean;
  /** A card of the page's own in the cards' place: Back closes it first. */
  ownCard: { close: () => void } | null;
}

/**
 * The browser's Back on the public map and the studio: the card on show's own ‹ or ✕ (backMove),
 * a card at a time, the trip first, then the place's card or the list, then the map. The address
 * never changes. `backFromTrip` is the trip's ‹ with the camera's move (useCardCamera).
 */
export function useBackClosesCards(
  routes: { selected: object | null },
  hotspots: { selected: object | null },
  cards: Cards,
  backFromTrip: (() => void) | null,
  hush: Hush,
  { isActive, ownCard }: BackOptions,
): void {
  const move = backMove({
    trip: routes.selected !== null,
    place: hotspots.selected !== null,
    list: cards.choosing,
    tripBehind: cards.tripBehind,
  });
  // A move whose button is not there closes everything: Back always takes something away.
  const moves: Record<BackMove, () => void> = {
    'trip-to-behind': hush(backFromTrip) ?? cards.closeAll,
    'place-to-trip': hush(cards.backToTrip) ?? cards.closeAll,
    'close-place': hush(cards.closeHotspot) ?? cards.closeAll,
    'close-all': cards.closeAll,
  };
  const isOpen = isActive && (ownCard !== null || move !== null);
  useBackCloses(isOpen, () => {
    if (ownCard) ownCard.close();
    else if (move) moves[move]();
  });
}
