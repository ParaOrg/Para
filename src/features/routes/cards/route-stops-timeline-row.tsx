import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

/** Figma's Variants: where on the timeline the row is. */
export type TimelineRowVariant = 'top' | 'middle' | 'bottom';

/**
 * Figma's States. Rest: on the rail. Selected: a picked ride's end at the timeline's own end.
 * SelectedTop / SelectedBottom: a ride starting or ending mid-timeline, the rail on one side only.
 * Unselected: outside a picked ride, its dot alone.
 */
export type TimelineRowState =
  'rest' | 'selected' | 'selectedTop' | 'selectedBottom' | 'unselected';

interface RouteStopsTimelineRowProps {
  variant: TimelineRowVariant;
  state: TimelineRowState;
  /** The rail's colour classes, TIMELINE_RAIL's for the trip's livery. */
  rail: string;
  /** Figma's Label: the stop's name. */
  label: ReactNode;
  /** Figma's ❄️ Content Slot, under the label: a ride's Start or End, a station's code, a picked stop's pill. */
  slot?: ReactNode;
}

/** Whether the rail runs above the row's dot, and below it, by place and state. */
function railOf(variant: TimelineRowVariant, state: TimelineRowState) {
  if (state === 'unselected') return { above: false, below: false };
  if (state === 'selectedTop') return { above: false, below: true };
  if (state === 'selectedBottom') return { above: true, below: false };
  return { above: variant !== 'top', below: variant !== 'bottom' };
}

/** What the suites read off a row (`data-rail`): the rail above and below its dot. */
function railState(above: boolean, below: boolean): string {
  if (above && below) return 'through';
  if (above) return 'above';
  if (below) return 'below';
  return 'disconnected';
}

/** The rail behind the dot: square through it, rounded on the side where the rail stops. */
function behindDot(above: boolean, below: boolean, rail: string): string | false {
  if (above && below) return rail;
  if (below) return cn('rounded-t-full', rail);
  if (above) return cn('rounded-b-full', rail);
  return false;
}

/**
 * One stop on a trip's timeline (RouteStopsTimeline in RouteHintuans, 4796:29755): its dot on the
 * rail, its name, Bold 18/26, and under it the slot, then a hairline. Every dot sits 10 down, by
 * the name's first line. The rail is as wide as the dot, so where it stops at a dot it ends in the
 * dot's own round: at the timeline's ends, and at a picked ride's. Those dots are ringed.
 */
export function RouteStopsTimelineRow({
  variant,
  state,
  rail,
  label,
  slot,
}: RouteStopsTimelineRowProps) {
  const { above, below } = railOf(variant, state);
  // Ringed where the rail ends at the dot: a picked ride's ends, and at rest the timeline's own.
  const isSelected = state === 'rest' ? variant !== 'middle' : state !== 'unselected';
  return (
    <span className="flex w-full items-start gap-2 px-4">
      <span
        aria-hidden
        data-rail={railState(above, below)}
        className="flex w-6 shrink-0 flex-col items-center self-stretch"
      >
        <span className={cn('h-2.5 w-full shrink-0', above && rail)} />
        {/* The rail runs on behind the dot, its end rounded where it stops there. */}
        <span className={cn('flex w-full justify-center', behindDot(above, below, rail))}>
          <StopDot rail={rail} isSelected={isSelected} />
        </span>
        <span className={cn('min-h-2.5 w-full flex-1', below && rail)} />
      </span>
      {/* The name and the slot under it, over the row's hairline (RouteStopsTimeline, 4611:10868). */}
      <span className="flex min-w-0 flex-1 flex-col gap-2 border-b-0-6 border-stroke-secondary pt-2.5 pb-5 text-lg/6.5 font-bold text-text-primary">
        <span className="min-w-0">{label}</span>
        {slot && <span className="flex flex-wrap items-center gap-2">{slot}</span>}
      </span>
    </span>
  );
}

interface StopDotProps {
  rail: string;
  isSelected: boolean;
}

/**
 * Figma's TimelineDot: a white 12 on the rail's colour, 24 across. Selected, ringed: a white 20
 * round a 12 centre in the rail's colour again, the same 24, so nothing moves.
 */
function StopDot({ rail, isSelected }: StopDotProps) {
  if (isSelected) {
    return (
      <span className={cn('flex shrink-0 rounded-full p-0.5', rail)}>
        <span className="grid size-5 place-items-center rounded-full bg-text-on-fill">
          <span className={cn('size-3 rounded-full', rail)} />
        </span>
      </span>
    );
  }
  return (
    <span className={cn('flex shrink-0 rounded-full p-1.5', rail)}>
      <span className="size-3 rounded-full bg-text-on-fill" />
    </span>
  );
}
