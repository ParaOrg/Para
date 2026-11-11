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

export type TimelineRowSize = 'large' | 'small';

interface RouteStopsTimelineRowProps {
  variant: TimelineRowVariant;
  state: TimelineRowState;
  size?: TimelineRowSize;
  /** The rail's colour classes, TIMELINE_SURFACE's for the card's livery. */
  rail: string;
  /** Figma's Label: the stop's name. */
  label: ReactNode;
  /** Figma's Slot, after the label: a ride's S or E, a station's code, a picked stop's pill. */
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

const ROW = {
  large: 'gap-2 px-4',
  small: 'gap-2 px-3',
} satisfies Record<TimelineRowSize, string>;

const WORDS = {
  large: 'py-2.5 text-base/6',
  small: 'py-2 text-sm/5',
} satisfies Record<TimelineRowSize, string>;

/** The dot at rest: its ring's padding and its white. Selected: its white and the centre in it. */
const DOT_RING = { large: 'p-1.5', small: 'p-1' } satisfies Record<TimelineRowSize, string>;
const DOT_WHITE = { large: 'size-3', small: 'size-2' } satisfies Record<TimelineRowSize, string>;
const DOT_SELECTED_WHITE = {
  large: 'size-5',
  small: 'size-3',
} satisfies Record<TimelineRowSize, string>;
const DOT_SELECTED_CENTRE = {
  large: 'size-3',
  small: 'size-2',
} satisfies Record<TimelineRowSize, string>;

const COLUMN = {
  large: 'w-6',
  small: 'w-4',
} satisfies Record<TimelineRowSize, string>;

/**
 * One stop on a trip's timeline (RouteStopsTimeline, 4611:10957): its dot on the rail, its name,
 * Medium, and a slot at the right. Large rows are 44 tall (17/24), small ones 40 (14/20). Every
 * dot sits 10 down, by the name's first line. The rail is as wide as the dot, so where it stops at
 * a dot it ends in the dot's own round: at the timeline's ends, and at a picked ride's.
 */
export function RouteStopsTimelineRow({
  variant,
  state,
  size = 'large',
  rail,
  label,
  slot,
}: RouteStopsTimelineRowProps) {
  const { above, below } = railOf(variant, state);
  const isSelected = state !== 'rest' && state !== 'unselected';
  return (
    <span className={cn('flex w-full items-start', ROW[size])}>
      <span
        aria-hidden
        data-rail={railState(above, below)}
        className={cn('flex shrink-0 flex-col items-center self-stretch', COLUMN[size])}
      >
        <span className={cn('h-2.5 w-full shrink-0', above && rail)} />
        {/* The rail runs on behind the dot, its end rounded where it stops there. */}
        <span className={cn('flex w-full justify-center', behindDot(above, below, rail))}>
          <StopDot rail={rail} size={size} isSelected={isSelected} />
        </span>
        <span className={cn('min-h-2.5 w-full flex-1', below && rail)} />
      </span>
      <span className={cn('flex min-w-0 flex-1 items-center gap-1 font-medium', WORDS[size])}>
        <span className="min-w-0 flex-1">{label}</span>
        {slot && <span className="flex shrink-0 items-center gap-1">{slot}</span>}
      </span>
    </span>
  );
}

interface StopDotProps {
  rail: string;
  size: TimelineRowSize;
  isSelected: boolean;
}

/**
 * Figma's TimelineDot: white ringed in the rail's colour, 24 (16 small). Selected, the white grows
 * and the ring thins to 2 round a centre in the rail's colour again, the same size either way.
 */
function StopDot({ rail, size, isSelected }: StopDotProps) {
  if (isSelected) {
    return (
      <span className={cn('flex shrink-0 rounded-full p-0.5', rail)}>
        <span
          className={cn(
            'grid place-items-center rounded-full bg-content-inverse',
            DOT_SELECTED_WHITE[size],
          )}
        >
          <span className={cn('rounded-full', DOT_SELECTED_CENTRE[size], rail)} />
        </span>
      </span>
    );
  }
  return (
    <span className={cn('flex shrink-0 rounded-full', DOT_RING[size], rail)}>
      <span className={cn('rounded-full bg-content-inverse', DOT_WHITE[size])} />
    </span>
  );
}
