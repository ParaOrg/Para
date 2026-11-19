import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { CircleArrowRightIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { ROW_PRESSED } from './livery-card';
import { CARD_INK } from './route-card-look';
import type { Livery } from '../model/liveries';

/** Where the row sits: on a RouteCard in its livery, or on the sheet's own surface. */
type DestinationRowGround = 'card' | 'surface';

interface DestinationRowProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'type' | 'children' | 'slot' | 'style' | 'dangerouslySetInnerHTML'
> {
  /** Figma's ✏️ Destination: the place the row's route goes to. */
  destination: string;
  /** Figma's ✏️ Additional Notes, under the place: a route's via. Nothing shows without one. */
  additionalNotes?: string | null;
  /** Figma's ❄️ Slot, after the place: a station's code on a train card's rows. */
  slot?: ReactNode;
  /** The route's livery: the card's ink on a card, the arrow's colour on the surface. */
  livery: Livery;
  on: DestinationRowGround;
}

/**
 * On the surface the arrow wears its mode's card fill (MiddleContent, 4795:20406) where that fill
 * stands out from the surface at 3:1, the least a non-text mark needs. Where it does not (UV
 * Express's grey, MRT-3's yellow), and for E-jeep, which has no card fill among the new semantics,
 * the arrow takes the words' Text/primary. tests/unit/destination-row-contrast-test.mjs checks
 * both against the tokens.
 */
const SURFACE_ARROW = {
  jeep: 'text-card-jeep-fill',
  'uv-express': 'text-text-primary',
  ejeep: 'text-text-primary',
  bus: 'text-card-bus-fill',
  'light-rail-way-one': 'text-card-lrt-one-fill',
  'light-rail-way-two': 'text-card-lrt-two-fill',
  'metro-rail-way-three': 'text-text-primary',
  ferry: 'text-card-ferry-fill',
} satisfies Record<Livery, string>;

// Figma draws no pressed or hover state; these keep today's: a card row presses to its card's
// timeline colour (ROW_PRESSED), a surface row to the grey pill the fare tile uses.
const ON_SURFACE =
  'rounded-full text-text-primary transition-colors duration-quick ease-move hover:bg-surface-tertiary active:bg-surface-tertiary';

/**
 * Figma's Destinationn (4794:20296): the arrow, the place a route goes to, and its via beneath, a
 * button that opens the route. Long places and notes wrap.
 */
export function DestinationRow({
  destination,
  additionalNotes = null,
  slot,
  livery,
  on,
  className,
  ...rest
}: DestinationRowProps) {
  const isOnSurface = on === 'surface';
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'flex w-full flex-col px-3 py-1.5 text-left',
        isOnSurface ? ON_SURFACE : cn(CARD_INK[livery], ROW_PRESSED[livery]),
        className,
      )}
    >
      <span className="flex w-full items-center gap-1.5">
        <span className={cn('size-5 shrink-0 *:size-full', isOnSurface && SURFACE_ARROW[livery])}>
          <CircleArrowRightIcon />
        </span>
        <span className="min-w-0 flex-1 text-lg/6.5 font-bold">{destination}</span>
        {/* The commas are for a screen reader: "Antipolo, PL13, Via Almar" reads as three things. */}
        {slot && (
          <>
            <span className="sr-only">, </span>
            {slot}
          </>
        )}
      </span>
      {additionalNotes && (
        <span className="text-sm/5 font-medium">
          <span className="sr-only">, </span>
          {additionalNotes}
        </span>
      )}
    </button>
  );
}
