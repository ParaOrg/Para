import {
  routeReportSchema,
  type RouteReport,
} from '../../../src/features/routes/model/route-report-schema';

/**
 * POST /api/report: a commuter's route report (ADR 0010, .scratch/route-reports/README.md).
 * Checked in order, cheapest first: the method and type, the sender's rate limit, the size, the
 * shape (the schema the page uses), Turnstile, then the database's own checks and caps through
 * submit_route_report. Nothing here logs the body, the token or who sent it.
 */

/** What report.submit_route_report answers (supabase/migrations/20261111100000_route_report.sql). */
export type SubmitAnswer =
  'sent' | 'bad_kind' | 'bad_note' | 'unknown_route' | 'busy' | 'route_full' | 'full';

/** What the page is told: the database's answer, or why it never got that far. */
export type ReportCode = SubmitAnswer | 'bad_request' | 'not_verified' | 'too_many' | 'unavailable';

/** The report as it goes to the database: the schema's report without the Turnstile token. */
export type ReportToSubmit = Omit<RouteReport, 'turnstileToken'>;

export interface ReportDeps {
  /** Whether this sender may send now (the Workers Rate Limiting binding). */
  isAllowed: () => Promise<boolean>;
  /** Whether Cloudflare says a person solved the challenge that gave this token. */
  isVerified: (token: string) => Promise<boolean>;
  /** Calls submit_route_report as report_sender. Throws when the database does not answer. */
  submit: (report: ReportToSubmit) => Promise<SubmitAnswer>;
}

/** A report is a few hundred bytes; anything far larger is not one. */
export const MAX_BODY_BYTES = 4096;

const STATUS: Record<ReportCode, number> = {
  sent: 201,
  bad_request: 400,
  bad_kind: 422,
  bad_note: 422,
  unknown_route: 422,
  not_verified: 403,
  too_many: 429,
  busy: 429,
  route_full: 429,
  full: 503,
  unavailable: 503,
};

const answer = (code: ReportCode, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify({ code }), {
    status: STATUS[code],
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });

export async function handleReport(request: Request, deps: ReportDeps): Promise<Response> {
  if (request.method !== 'POST')
    return new Response(null, { status: 405, headers: { allow: 'POST' } });
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) {
    return new Response(null, { status: 415 });
  }
  if (!(await deps.isAllowed())) return answer('too_many', { 'retry-after': '60' });

  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) return new Response(null, { status: 413 });
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES)
    return new Response(null, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return answer('bad_request');
  }
  const parsed = routeReportSchema.safeParse(body);
  if (!parsed.success) return answer('bad_request');
  const { turnstileToken, ...report } = parsed.data;

  if (!(await deps.isVerified(turnstileToken))) return answer('not_verified');

  try {
    return answer(await deps.submit(report));
  } catch {
    // A fixed line: the database's error can carry the report's values, so it is not logged.
    console.error('report: the database did not take the report');
    return answer('unavailable');
  }
}
