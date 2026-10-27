import { LOOP_CLOSED_M } from '@/features/routes/model/routes';

import type { Place } from './places';
import { ENDS_TAKEN, LOOP_TAKEN } from '../data/routes-write';

/**
 * Why the save panel refuses a save, before it writes anything: pure, so
 * tests/unit/save-checks-test.mjs can hold the sentences and their order.
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

/** What the refusals read from an ikot's form. */
interface LoopSaveCheck {
  signboard: string;
  /** From the line's first point to its last, in metres. */
  gapM: number;
  /** How many places the line passes: its trip needs somewhere to start and somewhere to go. */
  placesCount: number;
  /** Another ikot already has this signboard and via. */
  signboardTaken: boolean;
}

/** Why an ikot cannot be saved, in the panel's words and order; null to go ahead. */
export function loopSaveRefusal(check: LoopSaveCheck): string | null {
  if (check.signboard.trim() === '') {
    return 'An ikot is called by its signboard: write what the jeep says, like UP – Ikot.';
  }
  if (check.gapM > LOOP_CLOSED_M) {
    return `An ikot ends where it began. This line ends ${Math.round(check.gapM)} m from its start: go back to the map and press ⟲ Close the loop.`;
  }
  if (check.placesCount < 2) {
    return 'An ikot needs at least two places on it, so its trip has somewhere to start and somewhere to go.';
  }
  if (check.signboardTaken) return LOOP_TAKEN;
  return null;
}
