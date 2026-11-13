import type { Fix } from '@/features/routes/model/ride-recording';
import type { LngLat } from '@/shared/utils/geo';

import { markFixIndexes } from '../recorder/recording-marks';
import type { MarkRow } from '../storage/recording-schema';

/** Where each flag was: the fix it sits on, or null for every flag of a ride with no fixes. */
export function markPoints(kept: readonly Fix[], marks: readonly MarkRow[]): (LngLat | null)[] {
  if (kept.length === 0) return marks.map(() => null);
  return markFixIndexes(kept, marks).map((index) => kept[index].at);
}
