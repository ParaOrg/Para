import * as z from 'zod/mini';

import { routeName, loopName } from '@/features/routes/model/routes';
import { indexSchema, type Index } from '@/features/routes/published/index-schema';
import { MAP_FILE_URL } from '@/features/routes/published/map-file';

import { readAll } from './read-all';
import type { DraftKind } from './review-schema';
import { requireSupabase } from './supabase';

const subjectSchema = z.object({
  id: z.string(),
  status: z.enum(['approved', 'taken_down']),
  revision: z.number(),
  updated_at: z.string(),
  status_at: z.string(),
});
const routeSchema = z.extend(subjectSchema, {
  signboard: z.nullable(z.string()),
  head_stop_id: z.nullable(z.string()),
  tail_stop_id: z.nullable(z.string()),
  via: z.nullable(z.string()),
  is_loop: z.boolean(),
});
const hotspotSchema = z.extend(subjectSchema, { name: z.string() });

export interface PublicationSubject {
  id: string;
  kind: DraftKind;
  label: string;
  status: 'approved' | 'taken_down';
  revision: number;
  updatedAt: string;
  statusAt: string;
}
export interface PublicationState {
  publishedAt: string;
  subjects: PublicationSubject[];
  waiting: PublicationSubject[];
}

const sourceRevisionsSchema = z.object({
  routes: z.record(z.string(), z.number().check(z.int(), z.nonnegative())),
  hotspots: z.record(z.string(), z.number().check(z.int(), z.nonnegative())),
});

export function waitingForPublication(
  subjects: PublicationSubject[],
  index: Index,
): PublicationSubject[] {
  const metadata = z.object({ source_revisions: z.optional(sourceRevisionsSchema) }).parse(index);
  const revisions = metadata.source_revisions ?? null;
  const routes = new Set(index.directions.map((direction) => direction.routeId));
  const hotspots = new Set(index.hotspots.map((hotspot) => hotspot.id));
  const published = Date.parse(index.publishedAt);
  if (!Number.isFinite(published)) throw new Error('The published map has an invalid date.');
  return subjects.filter((subject) => {
    const isPublished = (subject.kind === 'route' ? routes : hotspots).has(subject.id);
    if (subject.status === 'taken_down') return isPublished;
    if (revisions)
      return (
        !isPublished ||
        (subject.kind === 'route' ? revisions.routes : revisions.hotspots)[subject.id] !==
          subject.revision
      );
    return (
      !isPublished ||
      Math.max(Date.parse(subject.updatedAt), Date.parse(subject.statusAt)) > published
    );
  });
}

export async function fetchPublicationState(): Promise<PublicationState> {
  const client = requireSupabase();
  const [routes, hotspots, response] = await Promise.all([
    readAll((from, to) =>
      client
        .from('route')
        .select(
          'id, signboard, head_stop_id, tail_stop_id, via, is_loop, status, revision, updated_at, status_at',
          { count: 'exact' },
        )
        .order('id')
        .range(from, to),
    ),
    readAll((from, to) =>
      client
        .from('stop')
        .select('id, name, status, revision, updated_at, status_at', { count: 'exact' })
        .order('id')
        .range(from, to),
    ),
    fetch(MAP_FILE_URL, { cache: 'no-store' }),
  ]);
  if (!response.ok) throw new Error(`Published map could not be read (${response.status}).`);
  const index = indexSchema.parse(await response.json());
  const placeNames = new Map(
    z
      .array(hotspotSchema)
      .parse(hotspots)
      .map((row) => [row.id, row.name]),
  );
  const subjects: PublicationSubject[] = [
    ...z
      .array(routeSchema)
      .parse(routes)
      .map((row) => ({
        id: row.id,
        kind: 'route' as const,
        label: row.is_loop
          ? loopName(row.signboard || 'Unnamed loop', row.via)
          : routeName(
              placeNames.get(row.head_stop_id ?? '') ?? 'Unknown head',
              placeNames.get(row.tail_stop_id ?? '') ?? 'Unknown tail',
              row.via,
            ),
        status: row.status,
        revision: row.revision,
        updatedAt: row.updated_at,
        statusAt: row.status_at,
      })),
    ...z
      .array(hotspotSchema)
      .parse(hotspots)
      .map((row) => ({
        id: row.id,
        kind: 'hotspot' as const,
        label: row.name,
        status: row.status,
        revision: row.revision,
        updatedAt: row.updated_at,
        statusAt: row.status_at,
      })),
  ];
  return {
    publishedAt: index.publishedAt,
    subjects,
    waiting: waitingForPublication(subjects, index),
  };
}
