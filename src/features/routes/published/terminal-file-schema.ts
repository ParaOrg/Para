import * as z from 'zod/mini';

/**
 * The OpenStreetMap terminal file (`/data/terminals.v1.json`, built by scripts/landmarks/build.sh
 * with scripts/terminals/; .scratch/terminals), as one contract: the reader parses the file with
 * it. Each row is a terminal OpenStreetMap maps, not one of Para's own: its id, what it serves, its
 * point and its name.
 */

export const TERMINAL_KINDS = ['jeepney', 'uv', 'bus', 'unknown'] as const;
export type TerminalKind = (typeof TERMINAL_KINDS)[number];

const terminalRowSchema = z.pipe(
  z.tuple([
    /** The OpenStreetMap element: `n`, `w` or `r` and its number. */
    z.string().check(z.regex(/^[nwr]\d+$/)),
    z.enum(TERMINAL_KINDS),
    z.number(),
    z.number(),
    z.string(),
  ]),
  z.transform(([osmId, kind, lng, lat, name]) => ({
    osmId,
    kind,
    point: [lng, lat] as const,
    name,
  })),
);
export type Terminal = z.infer<typeof terminalRowSchema>;

export const terminalFileSchema = z.object({
  schema: z.literal(1),
  license: z.string(),
  /** The credit the map shows: "© OpenStreetMap contributors". */
  attribution: z.string(),
  terminals: z.array(terminalRowSchema),
});
export type TerminalFile = z.infer<typeof terminalFileSchema>;
