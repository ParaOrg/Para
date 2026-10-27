import * as z from 'zod/mini';

import { LOOP_WORD } from '@/features/routes/model/routes';

import type { ReviewComparison } from './review-comparison';

const directionSchema = z.looseObject({
  id: z.string(),
  reversed: z.boolean(),
  shape: z.unknown(),
  control_points: z.unknown(),
  segments: z.unknown(),
});
const routePayloadSchema = z.object({
  route: z.looseObject({ is_loop: z.boolean() }),
  directions: z.array(directionSchema),
});
const hotspotPayloadSchema = z.object({ stop: z.unknown() });

type Direction = z.infer<typeof directionSchema>;

const isDrawn = (direction: Direction | undefined): boolean => direction?.shape != null;

const sameDrawing = (a: Direction, b: Direction): boolean =>
  JSON.stringify([a.shape, a.control_points, a.segments]) ===
  JSON.stringify([b.shape, b.control_points, b.segments]);

/**
 * What a draft does, in the editor's words, one line per change: which way's
 * line it draws, redraws or removes, and whether anything else about the
 * route or place changes. Read off the comparison the review already loads.
 */
export function reviewSummary(comparison: ReviewComparison): string[] {
  const route = routePayloadSchema.safeParse(comparison.proposed);
  if (!route.success) {
    if (!hotspotPayloadSchema.safeParse(comparison.proposed).success) return [];
    if (comparison.approved === null) return ['Adds this place'];
    return JSON.stringify(comparison.approved) === JSON.stringify(comparison.proposed)
      ? ['Changes nothing: it matches the approved place']
      : ['Changes this place'];
  }
  const proposed = route.data;
  const lineOf = (direction: Direction) =>
    proposed.route.is_loop
      ? `the ${LOOP_WORD.toLowerCase()} line`
      : `the ${direction.reversed ? 'Pabalik' : 'Papunta'} line`;
  if (comparison.approved === null) {
    return [
      'Adds this route',
      ...proposed.directions.filter(isDrawn).map((d) => `Draws ${lineOf(d)}`),
    ];
  }
  const approved = routePayloadSchema.safeParse(comparison.approved);
  const before = new Map(approved.success ? approved.data.directions.map((d) => [d.id, d]) : []);
  if (!proposed.directions.some(isDrawn) && [...before.values()].some(isDrawn)) {
    return ['Removes the whole route: no way has a line left'];
  }
  const lines: string[] = [];
  for (const direction of proposed.directions) {
    const old = before.get(direction.id);
    if (isDrawn(old) && !isDrawn(direction)) lines.push(`Removes ${lineOf(direction)}`);
    else if (!isDrawn(old) && isDrawn(direction)) lines.push(`Draws ${lineOf(direction)}`);
    else if (old && isDrawn(direction) && !sameDrawing(old, direction))
      lines.push(`Redraws ${lineOf(direction)}`);
  }
  const isSame = JSON.stringify(comparison.approved) === JSON.stringify(comparison.proposed);
  if (lines.length === 0)
    return [
      isSame ? 'Changes nothing: it matches the approved route' : 'Changes the route’s details',
    ];
  if (detailsChanged(approved.success ? approved.data : null, proposed))
    lines.push('Changes the route’s details');
  return lines;
}

/** Not details: a way's drawing, and the hintuan links a drawing change rewrites. */
const DRAWING_KEYS = new Set(['shape', 'control_points', 'segments', 'overview', 'links']);

const detailsOf = (direction: Direction): string =>
  JSON.stringify(Object.entries(direction).filter(([key]) => !DRAWING_KEYS.has(key)));

/**
 * The route's own facts, or a way's besides its drawing. A removed way loses
 * its signboards and borrowed section with its line, so only a way drawn on
 * both sides is compared.
 */
function detailsChanged(
  approved: z.infer<typeof routePayloadSchema> | null,
  proposed: z.infer<typeof routePayloadSchema>,
): boolean {
  if (!approved) return false;
  if (JSON.stringify(approved.route) !== JSON.stringify(proposed.route)) return true;
  const before = new Map(approved.directions.map((d) => [d.id, d]));
  return proposed.directions.some((direction) => {
    const old = before.get(direction.id);
    return (
      old !== undefined &&
      isDrawn(old) &&
      isDrawn(direction) &&
      detailsOf(old) !== detailsOf(direction)
    );
  });
}
