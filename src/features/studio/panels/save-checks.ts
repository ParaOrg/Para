import type { Place } from './places';
import { ENDS_TAKEN } from '../data/routes-write';

/**
 * Why the save panel refuses a save, before it writes anything: pure, so
 * tests/unit/save-checks-test.mjs can hold the sentences and their order
 * (split from save-panel.tsx, 2026-10-14).
 */

/** What the refusals read from the form. */
interface SaveCheck {
  headId: string;
  tailId: string;
  /** The places of the two picked boxes, when known. */
  headPlace: Place | undefined;
  tailPlace: Place | undefined;
  /** Another route already runs between these ends (Edit route). */
  endsTaken: boolean;
  /** Head and tail swapped (Edit route), which would turn the route round. */
  turnedRound: boolean;
}

/** Why the save cannot go, in the panel's words and order; null to go ahead. */
export function saveRefusal(check: SaveCheck): string | null {
  if (!check.headId || !check.tailId) {
    return 'Pick the place at each end. The route is named after them.';
  }
  if (check.headPlace && check.headPlace === check.tailPlace) {
    return 'The two ends have to be different places.';
  }
  if (check.endsTaken) return ENDS_TAKEN;
  if (check.turnedRound) {
    return 'Head and tail swapped would turn the route round, which Edit route cannot do: its directions keep their way round. Change one end at a time.';
  }
  return null;
}
