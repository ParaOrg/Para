// Where the public map's toast stands while a docked card fills the screen (ToastHost's
// `--toast-top`), so the card's first control stays in reach.

/**
 * While a place's card stands docked at full height, the toast sits 12 under its ✕ (map strip 24,
 * handle 18, ✕ 40), so the ✕ stays in reach; a trip has no ✕, and a floating card none there.
 */
export const TOAST_UNDER_FULL_CARD =
  '@max-float:group-has-[[data-testid=card][data-snap=full]:not([hidden]):not(:has([data-testid=trip]))]/map:[--toast-top:calc(env(safe-area-inset-top)+--spacing(23.5))]';

/**
 * While a trip stands at full height, filling the screen with no strip of map, the toast sits 12
 * under the ends card's ⇅ so the ⇅ stays in reach: its foot is 128.5 down (12 above the card;
 * Start's part 12 + 24 + 2 + 28 + 12; ⇅ 40 centred on the hairline), with a one-line origin. A
 * trip is the one `card` that docks: a :has() inside the group's :has() is no valid selector.
 */
export const TOAST_UNDER_FULL_TRIP =
  '@max-float:group-has-[[data-testid=card][data-floats=dock][data-snap=full]:not([hidden])]/map:[--toast-top:calc(env(safe-area-inset-top)+--spacing(35.125))]';
