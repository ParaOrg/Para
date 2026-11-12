import postgres from 'postgres';

import type { ReportToSubmit, SubmitAnswer } from './report';

const ANSWERS: readonly SubmitAnswer[] = [
  'sent',
  'bad_kind',
  'bad_note',
  'unknown_route',
  'busy',
  'route_full',
  'full',
];

const isAnswer = (value: unknown): value is SubmitAnswer =>
  ANSWERS.some((answer) => answer === value);

/**
 * Sends one report to report.submit_route_report, connected as report_sender (ADR 0010). One
 * connection per report, closed once answered: the transaction pooler (port 6543) holds the real
 * ones, so statements are not prepared. Throws when the database does not answer or answers
 * something else, and the caller says only that it is unavailable.
 */
export async function submitRouteReport(
  databaseUrl: string,
  report: ReportToSubmit,
  waitUntil: (promise: Promise<unknown>) => void,
): Promise<SubmitAnswer> {
  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    fetch_types: false,
    connect_timeout: 5,
    idle_timeout: 5,
  });
  try {
    const rows = await sql`
      select report.submit_route_report(
        ${report.routeId}::uuid, ${report.directionId ?? null}::uuid, ${report.kind}, ${report.note ?? null}
      ) as answer`;
    const answer: unknown = rows[0]?.answer;
    if (!isAnswer(answer)) throw new Error('report: an answer the Worker does not know');
    return answer;
  } finally {
    waitUntil(sql.end({ timeout: 5 }));
  }
}
