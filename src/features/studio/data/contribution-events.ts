import * as z from 'zod/mini';

const isoTime = z.pipe(
  z.string(),
  z.transform((iso) => Date.parse(iso)),
);

const markSchema = z.object({
  kind: z.literal('mark'),
  at: isoTime,
  /** The contributor's words on the stop they flagged; uploads before notes have none. A note that
   * is not text is dropped, never the mark with it. */
  note: z.catch(z.optional(z.string()), undefined),
});

/** A stop the contributor flagged: when, and their note on it, or null for none. */
export interface ContributionMark {
  at: number;
  note: string | null;
}

const modeSchema = z.object({
  kind: z.literal('mode'),
  at: isoTime,
  to: z.enum(['walk', 'ride']),
});

/** How the contributor moved for a part of a recording: Lakad (walk) or Sakay (ride). */
export type ContributionMode = z.infer<typeof modeSchema>['to'];

/** A stretch of a recording in one mode, `from` to `to` in milliseconds. */
export interface ContributionPart {
  mode: ContributionMode;
  from: number;
  to: number;
}

/**
 * The stops the contributor flagged, oldest first, each with its note. The events array also
 * carries other kinds (the way switches, the modes): anything that is not a mark with a readable
 * time is left out, never an error. A note that is blank reads as none.
 */
export function marksOf(events: unknown): ContributionMark[] {
  if (!Array.isArray(events)) return [];
  return events
    .flatMap((event: unknown) => {
      const parsed = z.safeParse(markSchema, event);
      if (!parsed.success || !Number.isFinite(parsed.data.at)) return [];
      const note = parsed.data.note?.trim() ?? '';
      return [{ at: parsed.data.at, note: note === '' ? null : note }];
    })
    .sort((a, b) => a.at - b.at);
}

/**
 * The recording's walk and ride parts, in time order, covering startedAt to
 * endedAt with no gaps. A part runs from its `mode` event to the next one or
 * the end. A recording without mode events (every one sent before Lakad and
 * Sakay) is one ride. Unreadable events are left out; a mode event before the
 * start counts from the start, one after the end is ignored, and a first event
 * after the start reaches back to it: the phone's clock, not the contributor,
 * left that sliver.
 */
export function partsOf(events: unknown, startedAt: number, endedAt: number): ContributionPart[] {
  const modes = (Array.isArray(events) ? events : [])
    .flatMap((event: unknown) => {
      const parsed = z.safeParse(modeSchema, event);
      return parsed.success && Number.isFinite(parsed.data.at) ? [parsed.data] : [];
    })
    .filter((mode) => mode.at <= endedAt)
    .sort((a, b) => a.at - b.at);
  const parts: ContributionPart[] = [];
  modes.forEach(({ at, to: mode }, i) => {
    const from = i === 0 ? startedAt : Math.max(at, startedAt);
    const next = modes[i + 1];
    const to = next ? Math.max(next.at, startedAt) : endedAt;
    if (to <= from) return;
    const last = parts.at(-1);
    if (last?.mode === mode) last.to = to;
    else parts.push({ mode, from, to });
  });
  return parts.length > 0 ? parts : [{ mode: 'ride', from: startedAt, to: endedAt }];
}
