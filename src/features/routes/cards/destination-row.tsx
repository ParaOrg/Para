import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { CircleArrowRightIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { ROW_PRESSED } from './livery-card';
import { CARD_INK } from './route-card-look';
import type { Livery } from '../model/liveries';

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
  /** The route's livery: the card's ink. */
  livery: Livery;
}

/**
 * Figma's Destinationn (4794:20296), on a RouteCard in its livery: the arrow, the place a route
 * goes to, and its via beneath, a button that opens the route. Long places and notes wrap. Figma
 * draws no pressed state; the row presses to its card's timeline colour (ROW_PRESSED) meanwhile.
 */
export function DestinationRow({
  destination,
  additionalNotes = null,
  slot,
  livery,
  className,
  ...rest
}: DestinationRowProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'flex w-full flex-col px-3 py-1.5 text-left',
        CARD_INK[livery],
        ROW_PRESSED[livery],
        className,
      )}
    >
      <span className="flex w-full items-center gap-1.5">
        <span className="size-5 shrink-0 *:size-full">
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
