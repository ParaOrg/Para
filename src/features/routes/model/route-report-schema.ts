import * as z from 'zod/mini';

/**
 * A commuter's report of a problem with a route, as the public map sends it to /api/report and as
 * the Worker there checks it (ADR 0010, .scratch/route-reports/README.md). One schema for both, so
 * the page and the Worker cannot disagree on what a report is. It holds nothing about the person:
 * no location, device or account. The Turnstile token proves a person sent it and is not stored.
 */

/** Mirrors the `kind` check in supabase/migrations/20261111100000_route_report.sql. */
export const ROUTE_REPORT_KINDS = [
  'wrong_line',
  'wrong_fare',
  'wrong_stop',
  'wrong_signboard',
  'no_longer_runs',
  'other',
] as const;
export type RouteReportKind = (typeof ROUTE_REPORT_KINDS)[number];

/** The most a note may hold, as the database's check says. */
export const ROUTE_REPORT_NOTE_MAX = 500;

export const routeReportSchema = z
  .object({
    routeId: z.uuid(),
    /** The direction showing when the commuter reported, when there was one. */
    directionId: z.optional(z.nullable(z.uuid())),
    kind: z.enum(ROUTE_REPORT_KINDS),
    /** The commuter's words: optional, trimmed, and required to say what "other" is. */
    note: z.optional(
      z.pipe(
        z.string(),
        z.transform((note) => note.trim()),
      ),
    ),
    turnstileToken: z.string().check(z.minLength(1), z.maxLength(2048)),
  })
  .check(
    z.refine((report) => (report.note ?? '').length <= ROUTE_REPORT_NOTE_MAX, {
      message: `A note holds at most ${ROUTE_REPORT_NOTE_MAX} characters.`,
      path: ['note'],
    }),
    z.refine((report) => report.kind !== 'other' || (report.note ?? '').length > 0, {
      message: 'Say what the problem is.',
      path: ['note'],
    }),
  );

export type RouteReport = z.infer<typeof routeReportSchema>;
