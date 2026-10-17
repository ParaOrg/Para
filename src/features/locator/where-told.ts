import { NEAR_MAX_ACCURACY_M, type CommuterWhere } from '@/features/routes/map/loop-tip';
import { haversine } from '@/shared/utils/geo';

/** How far the commuter moves before the page is told again. */
const WHERE_MOVE_M = 50;

/**
 * Whether the page should be told this fix, given the last one it was told
 * (null: none yet). The first fix; a move of more than WHERE_MOVE_M; and a
 * coarse fix sharpening on the spot, the vague one a phone gives before its
 * GPS has found itself, which says nothing of where the commuter is, then the
 * sharp one that does.
 */
export function shouldTell(last: CommuterWhere | null, next: CommuterWhere): boolean {
  if (!last) return true;
  if (haversine(last.at, next.at) > WHERE_MOVE_M) return true;
  return last.accuracyM > NEAR_MAX_ACCURACY_M && next.accuracyM <= NEAR_MAX_ACCURACY_M;
}
