import type { ReactNode } from 'react';

/** Figma's TimelineStick Variants (3716:1759): where on the timeline its row is. */
export type TimelineStickVariant =
  'top' | 'middleTop' | 'middle' | 'middleBottom' | 'bottom' | 'disclosure';

/** Figma's TimelineStick Connection: on the ride's rail, or a dot on its own. */
export type TimelineStickConnection = 'connected' | 'disconnected';

interface TimelineStickDotProps {
  variant: Exclude<TimelineStickVariant, 'disclosure'>;
  connection?: TimelineStickConnection;
  /** The rail's colour classes, TIMELINE_SURFACE's for the card's livery. */
  rail: string;
  /** Figma's TimelineDot in the piece: at rest or Selected, as the row has it. */
  dot: ReactNode;
}

interface TimelineStickDisclosureProps {
  /** The fold row's piece is the rail alone: no dot. */
  variant: 'disclosure';
  connection?: TimelineStickConnection;
  rail: string;
}

export type TimelineStickProps = TimelineStickDotProps | TimelineStickDisclosureProps;

/**
 * Whether a Connected piece draws its rail above the dot (Figma's layer
 * "Frame 71") and below it ("Frame 72"). MiddleTop and MiddleBottom are the
 * owner's pieces of 2026-10-15 for a ride that starts or ends mid-list. Top
 * has no stretch above and Bottom none below, so theirs are never drawn.
 */
const RAIL_ABOVE = {
  top: false,
  middleTop: false,
  middle: true,
  middleBottom: true,
  bottom: true,
  disclosure: true,
} satisfies Record<TimelineStickVariant, boolean>;

const RAIL_BELOW = {
  top: true,
  middleTop: true,
  middle: true,
  middleBottom: false,
  bottom: false,
  disclosure: false,
} satisfies Record<TimelineStickVariant, boolean>;

/**
 * The rail's column, 24 wide, as tall as its row's content; the rows set
 * their own padding round it (timeline-route-detail.tsx). Bottom's stretch
 * above its dot is 16 tall, Figma's TimelineStick Bottom (20 before
 * 2026-10-13).
 */
const STICK = 'flex w-6 shrink-0 flex-col items-center self-stretch';

/**
 * Figma's TimelineStick: one row's stretch of the rail, and its dot. A
 * stretch with no rail keeps its place, unfilled, as Figma's layer keeps
 * its size with no fill, so a dot sits where it would on the rail and the
 * rows line up whichever piece they wear.
 *
 * The rail runs only along the ride (the owner, 2026-10-15): the row it
 * starts at wears MiddleTop (Top at the origin), the row it ends at
 * MiddleBottom (Bottom at the destination), the rows between Middle, and
 * every row outside it Disconnected, its dot alone. Some of his set's
 * states still break the rail at the ride's ends and keep a rail of their
 * own outside it; the rule stands over them.
 */
export function TimelineStick(props: TimelineStickProps) {
  const isConnected = (props.connection ?? 'connected') === 'connected';
  const above = isConnected && RAIL_ABOVE[props.variant] ? props.rail : '';
  const below = isConnected && RAIL_BELOW[props.variant] ? props.rail : '';

  if (props.variant === 'disclosure') {
    return (
      <span aria-hidden data-rail={above ? 'connected' : 'disconnected'} className={STICK}>
        <span className={'min-h-px w-2 flex-1 ' + above} />
      </span>
    );
  }

  return (
    <span aria-hidden data-rail={railState(above, below)} className={STICK}>
      {props.variant === 'bottom' && <span className={'-mb-0.5 h-4 w-2 shrink-0 ' + above} />}
      {props.variant !== 'top' && props.variant !== 'bottom' && (
        <span className={'-mb-0.5 min-h-px w-2 flex-1 ' + above} />
      )}
      {props.dot}
      {props.variant !== 'bottom' && <span className={'min-h-px w-2 flex-1 ' + below} />}
    </span>
  );
}

/** What phone-test reads off a piece (`data-rail`): the rail above and below its dot. */
function railState(above: string, below: string): string {
  if (above && below) return 'through';
  if (above) return 'above';
  if (below) return 'below';
  return 'disconnected';
}
