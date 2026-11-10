import { RIDE_GAP_REASONS, type RideGap, type RideState } from '../native-bridge/native-contract';
import type { Recording } from '../storage/recording-schema';

/** A ride's history as the phone keeps it: its switches and its closed paused or resumed gaps. */
export type RideHistory = Pick<RideState, 'modes' | 'gaps'>;

/**
 * The history the page tells the phone (RidePlugin.setState), for the phone to put together with
 * its own (RideHistory.java). Gaps the phone does not keep (the page hidden, a silence) stay out.
 */
export function historyOf({ modes, gaps }: Pick<Recording, 'modes' | 'gaps'>): RideHistory {
  const kept: RideGap[] = [];
  for (const gap of gaps) {
    // A gap that is both is the phone's as paused: the time the contributor chose not to record.
    const reason = RIDE_GAP_REASONS.find((kept) => gap.reasons.includes(kept));
    if (reason) kept.push({ from: gap.from, to: gap.to, reason });
  }
  return { modes: modes.map(({ time, to }) => ({ time, to })), gaps: kept };
}
