import { Button } from '@/design-system/primitives/button';
import type { RouteReportKind } from '@/features/routes/model/route-report-schema';

import { REPORT_KIND_LABEL, reportAge } from './report-labels';

/** One open report as the list shows it: the route and way already named. */
export interface RouteReportRow {
  id: string;
  routeLabel: string;
  /** The way it was showing, when the commuter's view had one. */
  wayLabel: string | null;
  kind: RouteReportKind;
  note: string | null;
  createdAt: number;
}

export type RouteReportListState =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | {
      status: 'ready';
      reports: RouteReportRow[];
      now: number;
      /** The report whose Done or Dismiss is under way; the others wait. */
      busyId: string | null;
      /** What the last Done or Dismiss did, in the editor's words. */
      notice: string | null;
      onResolve: (id: string, status: 'done' | 'dismissed') => void;
    };

interface RouteReportListProps {
  state: RouteReportListState;
}

/** Commuters' open reports about routes, newest first, each with Done and Dismiss (ADR 0010). */
export function RouteReportList({ state }: RouteReportListProps) {
  if (state.status === 'loading') return <p role="status">Reading reports…</p>;
  if (state.status === 'error')
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert">{state.message}</p>
        <Button variant="secondary" size="small" label="Try again" onClick={state.onRetry} />
      </div>
    );
  const count = state.reports.length;
  return (
    <section aria-labelledby="reports-heading" className="flex flex-col gap-2">
      <h2 id="reports-heading" className="font-bold">
        Reports from commuters{count > 0 && ` · ${count} open`}
      </h2>
      <p role="status" className="text-sm text-content-secondary empty:hidden">
        {state.notice}
      </p>
      {count === 0 ? (
        <p>No open reports.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {state.reports.map((report) => (
            <li key={report.id} className="rounded-lg border border-border-primary p-3">
              <strong>{report.routeLabel}</strong>
              <p className="text-sm">
                {REPORT_KIND_LABEL[report.kind]}
                {report.wayLabel && ` · ${report.wayLabel}`} ·{' '}
                <time dateTime={new Date(report.createdAt).toISOString()}>
                  {reportAge(report.createdAt, state.now)}
                </time>
              </p>
              {report.note && <p className="mt-1 text-sm break-words">“{report.note}”</p>}
              <div
                role="group"
                aria-label={`${report.routeLabel}: ${REPORT_KIND_LABEL[report.kind]}`}
                className="mt-2 flex gap-2"
              >
                <Button
                  variant="secondary"
                  size="small"
                  label="Done"
                  disabled={state.busyId !== null}
                  onClick={() => state.onResolve(report.id, 'done')}
                />
                <Button
                  variant="secondary"
                  size="small"
                  label="Dismiss"
                  disabled={state.busyId !== null}
                  onClick={() => state.onResolve(report.id, 'dismissed')}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
