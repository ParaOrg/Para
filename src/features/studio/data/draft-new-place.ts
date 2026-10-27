import { hotspotRowSchema } from '@/features/routes/model/hotspot-schema';
import type { HotspotRow } from '@/features/routes/model/hotspots';

import { draftRefusal, saveHotspotDraft } from './draft-save';
import { hotspotColumns, type SaveHotspotInput } from './hotspots-write';

/** Only the current picker sees this place until its own review is approved. */
export async function saveNewPlaceDraft(input: SaveHotspotInput, id: string): Promise<HotspotRow> {
  const { result } = await saveHotspotDraft(input, id);
  const refusal = draftRefusal(result);
  if (refusal) throw new Error(refusal);
  return hotspotRowSchema.parse({
    ...hotspotColumns(input).row,
    id,
    line: null,
    created_at: new Date().toISOString(),
  });
}
