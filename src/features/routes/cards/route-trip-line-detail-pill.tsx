import { TIMELINE_PILL } from './livery-card';
import type { Livery } from '../model/liveries';

export interface RouteTripLineDetailPillProps {
  livery: Livery;
  /** The station's code, YL06, on a train; null for a jeepney's hintuan and a station the table does not know. */
  code: string | null;
  /** The pesos of the ride to there, as `pesoRange` writes them: ₱13, ₱13–24. */
  pesos: string;
}

/** One white half: Figma's padding 2 × 6, text-sm/medium in SN Pro. TIMELINE_PILL gives the fill and the words. */
const HALF = 'px-1.5 py-0.5 font-sn-pro text-sm/5 font-medium whitespace-nowrap';

/**
 * The pill beside a picked hintuan, the owner's RouteTripLineDetailPill
 * (4161:8299, 2026-10-15). Its Property 1 is not a prop: the code decides it.
 *
 * - Two (4161:8298), on a train: the station's code and the pesos as two
 *   white halves 1 px apart (spacing/px), so the card's colour between them
 *   is the divider. They replace the dot of "YL06 · ₱20" (2026-10-13).
 * - One (4161:8300), on a jeep: the pesos alone, rounded both ends.
 *
 * The design writes ₱13-24 with a hyphen; the pesos keep pesoRange's en
 * dash (the owner, 2026-10-15). The space between the halves is drawn by
 * the gap, not the text, and is there so a screen reader hears "YL06 ₱20"
 * as two words.
 */
export function RouteTripLineDetailPill({ livery, code, pesos }: RouteTripLineDetailPillProps) {
  const colours = TIMELINE_PILL[livery];
  if (!code) {
    return (
      <span data-testid="trip-hintuan-fare" className={`shrink-0 rounded-full ${HALF} ${colours}`}>
        {pesos}
      </span>
    );
  }
  return (
    <span data-testid="trip-hintuan-fare" className="flex shrink-0 gap-px">
      <span data-part="code" className={`rounded-l-full ${HALF} ${colours}`}>
        {code}
      </span>{' '}
      <span data-part="pesos" className={`rounded-r-full ${HALF} ${colours}`}>
        {pesos}
      </span>
    </span>
  );
}
