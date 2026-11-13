import { cn } from '@/shared/utils/cn';

/** Where a stop sits on the timeline: its rail runs on from the first to the last. */
export type RailPlace = 'first' | 'middle' | 'last' | 'only';

// The rail starts 10 down at the first stop's dot, runs whole past the middle ones, and ends at the
// last stop's dot; a lone stop is its dot alone.
const RAIL = {
  first: 'mt-2.5 flex-1 rounded-t-full',
  middle: 'flex-1 pt-2.5',
  last: 'rounded-b-full pt-2.5',
  only: 'mt-2.5 rounded-full',
} satisfies Record<RailPlace, string>;

interface StopTimelineRailProps {
  place: RailPlace;
}

/** The timeline's rail and dot beside a stop (TimelineDot, 4611:10833), in Background/surface-inverse-secondary. */
export function StopTimelineRail({ place }: StopTimelineRailProps) {
  return (
    <div aria-hidden className="flex w-6 shrink-0 flex-col self-stretch">
      <div className={cn('flex flex-col items-center bg-surface-inverse-secondary', RAIL[place])}>
        <span className="flex size-6 items-center justify-center rounded-full bg-surface-inverse-secondary">
          <span className="size-3 rounded-full bg-content-inverse" />
        </span>
      </div>
    </div>
  );
}
