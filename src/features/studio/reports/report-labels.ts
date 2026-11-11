import type { RouteReportKind } from '@/features/routes/model/route-report-schema';

/** How the studio names each kind of report: the owner's words (Q198). */
export const REPORT_KIND_LABEL: Record<RouteReportKind, string> = {
  wrong_line: 'Wrong line on the map',
  wrong_fare: 'Wrong fare',
  wrong_stop: 'Wrong stop',
  wrong_signboard: 'Wrong signboard',
  no_longer_runs: 'No longer runs',
  other: 'Something else',
};

const AGE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const STEPS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** How long ago a report came, in words: "3 hours ago", "yesterday", "just now". */
export function reportAge(createdAt: number, now: number): string {
  const elapsed = Math.max(0, now - createdAt);
  for (const [unit, size] of STEPS) {
    if (elapsed >= size) return AGE.format(-Math.floor(elapsed / size), unit);
  }
  return 'just now';
}
