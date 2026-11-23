import type { Phase } from './recording-state';
import type { RideNoticeState } from '../native-bridge/native-contract';

/**
 * Where the app's ride notification is told the ride is, for the recorder's phase: recording or
 * paused as it is, no ride for every other. Null while the page is still loading what the phone
 * holds: it does not know yet, and a "no ride" then would end a ride the app's service is still
 * recording (RidePlugin.setState), before the page could take it up.
 */
export function noticePhaseOf(phase: Phase): RideNoticeState['phase'] | null {
  if (phase === 'loading') return null;
  return phase === 'recording' || phase === 'paused' ? phase : 'none';
}
