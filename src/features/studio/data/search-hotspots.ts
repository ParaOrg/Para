import * as z from 'zod/mini';

import { hotspotRowSchema } from '@/features/routes/model/hotspot-schema';
import type { Hotspot } from '@/features/routes/model/hotspots';

import type { DraftRow } from './review-schema';

/** A hotspot draft's payload, as far as search reads it: the row it would save (hotspotDraftPayload). */
const hotspotDraftStopSchema = z.object({
  stop: z.looseObject({
    name: z.string(),
    informal: z.nullable(z.string()),
    aliases: z.array(z.string()),
  }),
});

export interface SearchableHotspots {
  /** The hotspots search lists: every saved one, and each new place still a draft. */
  hotspots: Hotspot[];
  /** Which of them are new places still in a draft: marked "Draft", and not on the map yet. */
  draftIds: ReadonlySet<string>;
}

/** The names a hotspot answers to, as its own aliases: whatever of them it does not have yet. */
function withNames(hotspot: Hotspot, names: readonly (string | null)[]): Hotspot {
  const known = new Set(
    [hotspot.name, hotspot.informal, ...hotspot.aliases].map((name) => name?.trim().toLowerCase()),
  );
  const added: string[] = [];
  for (const name of names) {
    const trimmed = name?.trim();
    if (!trimmed || known.has(trimmed.toLowerCase())) continue;
    known.add(trimmed.toLowerCase());
    added.push(trimmed);
  }
  return added.length === 0 ? hotspot : { ...hotspot, aliases: [...hotspot.aliases, ...added] };
}

/**
 * What studio search looks through (.scratch/place-search, ticket 05, the owner's answer to
 * question 9): the saved hotspots, each new place still in a draft as a hotspot of its own, and
 * the names a draft edit is giving a saved hotspot as more of its names, so an editor finds a
 * place by the name they just typed. A draft whose payload does not read is passed over, never
 * an error: search is no place to report a broken draft.
 */
export function searchableHotspots(
  saved: readonly Hotspot[],
  drafts: readonly DraftRow[],
): SearchableHotspots {
  const byId = new Map(saved.map((hotspot) => [hotspot.id, hotspot]));
  const draftIds = new Set<string>();
  for (const draft of drafts) {
    if (draft.kind !== 'hotspot') continue;
    const existing = byId.get(draft.subject_id);
    if (existing) {
      const read = hotspotDraftStopSchema.safeParse(draft.payload);
      if (!read.success) continue;
      const { name, informal, aliases } = read.data.stop;
      byId.set(existing.id, withNames(existing, [name, informal, ...aliases]));
    } else if (draft.is_new) {
      const payload = hotspotDraftStopSchema.safeParse(draft.payload);
      if (!payload.success) continue;
      const row = hotspotRowSchema.safeParse({
        ...payload.data.stop,
        id: draft.subject_id,
        created_at: draft.created_at,
      });
      if (!row.success) continue;
      byId.set(row.data.id, row.data);
      draftIds.add(row.data.id);
    }
  }
  return { hotspots: [...byId.values()], draftIds };
}
