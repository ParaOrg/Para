import { cn } from '@/shared/utils/cn';

import type { TransitLineFact } from './transit-line-info';

/** A row of the summary card: a Status of Draft reads in text/text-error. */
export interface RouteSummaryFact extends TransitLineFact {
  isAlert?: boolean;
}

interface RouteSummaryCardProps {
  /** In order: Origin, Destination, Via, Status. */
  facts: readonly RouteSummaryFact[];
}

/**
 * The route line detail's summary card (4915:2713), raised over the panel under its actions: a
 * white card, 16 round, 14 in, with shadow-large; each row a 140-wide name in Medium and its value
 * in Regular, 14/20 in Content/quaternary, 10 apart.
 */
export function RouteSummaryCard({ facts }: RouteSummaryCardProps) {
  return (
    <dl
      data-testid="route-summary"
      className="flex w-full flex-col gap-2.5 rounded-2xl bg-surface p-3.5 text-sm/5 text-content-quaternary shadow-large"
    >
      {facts.map(({ label, value, isAlert = false }) => (
        <div key={label} className="flex w-full">
          <dt className="w-35 shrink-0 font-medium">{label}</dt>
          <dd className={cn('min-w-0 flex-1', isAlert && 'text-text-error')}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
