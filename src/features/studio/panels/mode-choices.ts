import { isLineMode, MODES, type TransportMode } from '@/features/routes/model/routes';

/**
 * Modes no new route takes: P2P is drawn as a bus for now. Routes already saved with one keep
 * it, and read and publish as before; the picker offers it only to such a route, so its mode
 * shows and can be changed.
 */
const RETIRED_MODES: readonly TransportMode[] = ['p2p'];

/**
 * The Transportation mode picker's choices for a route whose mode is `current`. A line, a
 * train's or the ferry's, comes in by its import, with its line named: one drawn here would
 * have none and stop nowhere. A retired mode is not offered. Either stays listed for the route
 * that already has it.
 */
export function modeChoices(current: TransportMode): { value: TransportMode; label: string }[] {
  return MODES.filter(
    (m) => m.value === current || (!isLineMode(m.value) && !RETIRED_MODES.includes(m.value)),
  );
}
