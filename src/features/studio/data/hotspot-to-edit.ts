import * as z from 'zod/mini';

import { pointSchema, polygonSchema } from '@/features/routes/model/geojson-schema';
import type { HotspotRow } from '@/features/routes/model/hotspots';

import type { DraftRow } from './review-schema';

/** The parts of a hotspot draft's payload Edit opens: its row and its links (drafts.ts hotspotDraftPayload). */
const hotspotDraftFieldsSchema = z.object({
  stop: z.object({
    name: z.string(),
    informal: z.nullable(z.string()),
    aliases: z.array(z.string()),
    kind: z.enum(['terminal', 'hintuan']),
    note: z.nullable(z.string()),
    area: polygonSchema,
    point: pointSchema,
  }),
  links: z.array(z.object({ route_variant_id: z.string() })),
});

/** A hotspot as Edit opens it, and the directions its terminal checklist starts ticked with. */
export interface HotspotToEdit {
  hotspot: HotspotRow;
  /** The draft's links; null when there is no draft, so the approved links stand. */
  linkedDirectionIds: string[] | null;
}

/**
 * The hotspot as the editor's own draft of it has it, else as approved. A
 * save builds on the draft (draft-reads.ts hotspotDraftBase), so opening the
 * approved outline and names would save them over the draft's changes. The
 * station line is not edited here and stays the row's. Another editor's draft
 * never reaches this: the card offers no Edit on it.
 */
export function hotspotToEdit(approved: HotspotRow, draft: DraftRow | null): HotspotToEdit {
  if (!draft) return { hotspot: approved, linkedDirectionIds: null };
  const { stop, links } = hotspotDraftFieldsSchema.parse(draft.payload);
  return {
    hotspot: { ...approved, ...stop },
    linkedDirectionIds: links.map((l) => l.route_variant_id),
  };
}
