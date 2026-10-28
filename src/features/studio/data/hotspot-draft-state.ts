import * as z from 'zod/mini';

import { hotspotDraftPayload } from './drafts';
import { hotspotColumns, hotspotLinks, type SaveHotspotInput } from './hotspots-write';

/** A hotspot draft's payload, as far as the next edit needs it: its station line. */
export const hotspotPayloadSchema = z.object({
  version: z.literal(1),
  stop: z.looseObject({ line: z.optional(z.nullable(z.string())) }),
});

/** A hotspot's whole draft: its row as saveHotspot writes it, and every one of its links. */
export function hotspotPayloadOf(
  input: SaveHotspotInput,
  line: string | null,
): Record<string, unknown> {
  const { row, ring } = hotspotColumns(input);
  const links = hotspotLinks(input, ring, line).map((l) => ({
    route_variant_id: l.directionId,
    stop_sequence: l.sequence,
  }));
  return hotspotDraftPayload({ ...row, line }, links);
}
