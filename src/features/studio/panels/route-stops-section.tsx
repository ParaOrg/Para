import { useId } from 'react';

import type { TimelineRow } from '@/features/routes/model/timeline';
import { cn } from '@/shared/utils/cn';

interface RouteStopsSectionProps {
  /** The direction's stops in the order it rides them: its start, its hintuans, its end. */
  stops: readonly TimelineRow[];
  /** A stop tapped: the map moves to it. */
  onStop: (id: string) => void;
}

/**
 * The route line detail's Route Stops (4905:28411): one row per stop on a rail in Text/tertiary,
 * each dot white within it, the rail rounded off at the first and the last; the stop's name in
 * Medium 14/20 over a hairline. A row is a button that moves the map to its stop. With none yet,
 * a line saying where they come from.
 */
export function RouteStopsSection({ stops, onStop }: RouteStopsSectionProps) {
  const heading = useId();
  return (
    <section aria-labelledby={heading} className="flex w-full flex-col gap-2.5">
      <h3 id={heading} className="text-base-lower/6 font-bold text-text-primary">
        Route Stops
      </h3>
      {stops.length === 0 ? (
        <p className="text-sm/5 text-content-tertiary">
          No stops yet — hintuans along the line show here
        </p>
      ) : (
        <ol data-testid="route-stops" className="flex w-full flex-col">
          {stops.map((stop, i) => (
            <li key={stop.id} className="flex w-full items-stretch gap-2">
              <span aria-hidden className="flex w-4 shrink-0 flex-col items-center">
                <span className={cn('h-2.5 w-full', i > 0 && 'bg-text-tertiary')} />
                <span
                  className={cn(
                    'flex w-full justify-center bg-text-tertiary p-1',
                    i === 0 && 'rounded-t-full',
                    i === stops.length - 1 && 'rounded-b-full',
                  )}
                >
                  <span className="size-2 rounded-full bg-content-inverse" />
                </span>
                <span className={cn('w-full flex-1', i < stops.length - 1 && 'bg-text-tertiary')} />
              </span>
              <button
                type="button"
                onClick={() => onStop(stop.id)}
                className="min-w-0 flex-1 border-b-0-6 border-border-secondary pt-2 pb-3 text-left text-sm/5 font-medium text-text-primary"
              >
                {stop.label}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
