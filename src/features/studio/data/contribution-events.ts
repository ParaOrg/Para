import * as z from 'zod/mini';

const markSchema = z.object({
  kind: z.literal('mark'),
  at: z.pipe(
    z.string(),
    z.transform((iso) => Date.parse(iso)),
  ),
});

/**
 * The times the contributor pressed Mark, oldest first. The events array also
 * carries other kinds (the way switches, and ones not made yet): anything that
 * is not a mark with a readable time is left out, never an error.
 */
export function marksOf(events: unknown): number[] {
  if (!Array.isArray(events)) return [];
  return events
    .flatMap((event: unknown) => {
      const parsed = z.safeParse(markSchema, event);
      return parsed.success && Number.isFinite(parsed.data.at) ? [parsed.data.at] : [];
    })
    .sort((a, b) => a - b);
}
