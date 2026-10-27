import * as z from 'zod/mini';

import { draftOf } from './drafts';
import { reviewDraftOf } from './review-label';
import { requireSupabase } from './supabase';

const payloadSchema = z.object({
  route: z.object({ head_stop_id: z.nullable(z.string()), tail_stop_id: z.nullable(z.string()) }),
  directions: z.array(z.object({ links: z.array(z.object({ stop_id: z.string() })) })),
});
const placeSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['approved', 'taken_down']),
});
export interface ReviewDependency {
  subjectId: string;
  label: string;
  draftId: string | null;
}

export async function reviewDependencies(
  payload: Record<string, unknown>,
): Promise<ReviewDependency[]> {
  const parsed = payloadSchema.parse(payload);
  const ids = [
    ...new Set(
      [
        parsed.route.head_stop_id,
        parsed.route.tail_stop_id,
        ...parsed.directions.flatMap((direction) => direction.links.map((link) => link.stop_id)),
      ].filter((id): id is string => id !== null),
    ),
  ];
  const client = requireSupabase();
  const batches: string[][] = [];
  for (let at = 0; at < ids.length; at += 30) batches.push(ids.slice(at, at + 30));
  const found = (
    await Promise.all(
      batches.map(async (batch) => {
        const { data, error } = await client
          .from('stop')
          .select('id, name, status')
          .in('id', batch);
        if (error) throw new Error(error.message);
        return z.array(placeSchema).parse(data);
      }),
    )
  ).flat();
  return Promise.all(
    ids
      .filter((id) => !found.some((place) => place.id === id && place.status === 'approved'))
      .map(async (id) => {
        const draft = await draftOf('hotspot', id);
        return {
          subjectId: id,
          label: draft
            ? reviewDraftOf(draft).label
            : (found.find((place) => place.id === id)?.name ?? 'Missing place'),
          draftId: draft?.id ?? null,
        };
      }),
  );
}
