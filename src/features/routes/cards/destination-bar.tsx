import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/shared/utils/cn';

import { RouteEndPointLines } from './route-end-point-lines';

/** Figma's Variants: Top, a row with more below it; End, the last, its line ending at its arrow. */
type DestinationBarVariant = 'top' | 'end';

interface DestinationBarProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'type' | 'children' | 'slot' | 'style' | 'dangerouslySetInnerHTML'
> {
  /** Figma's Destination: the place the row's route goes to. */
  destination: string;
  /** Figma's Additional Notes, under the place: a route's via. Nothing shows without one. */
  additionalNotes?: string | null;
  variant: DestinationBarVariant;
}

const POSITION = {
  top: 'top',
  end: 'bottom',
} satisfies Record<DestinationBarVariant, 'top' | 'bottom'>;

// Figma draws no pressed or hover state; bg/fill/fill-secondary stands in until the owner draws one.
const PRESSABLE =
  'transition-colors duration-quick ease-move hover:bg-bg-fill-secondary active:bg-bg-fill-secondary';

/**
 * Figma's DestinationBar (4820:33754): one of the other routes out of where a trip starts, its
 * tree line in text/quaternary, then the place, SemiBold 16/24, and its via, Regular 14/20, over a
 * hairline (stroke-secondary) the End row goes without. A button that opens the route. Long places
 * and notes wrap.
 */
export function DestinationBar({
  destination,
  additionalNotes = null,
  variant,
  className,
  ...rest
}: DestinationBarProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cn('flex w-full gap-2 pl-3 text-left font-sn-pro', PRESSABLE, className)}
    >
      <span className="flex self-stretch text-text-quaternary">
        <RouteEndPointLines position={POSITION[variant]} isFaint={false} arrowAlign="first-line" />
      </span>
      <span
        className={cn(
          'flex min-w-0 flex-1 flex-col py-2 break-words text-text-primary',
          variant === 'top' && 'border-b-0-6 border-stroke-secondary',
        )}
      >
        <span className="text-base-lower/6 font-semibold">{destination}</span>
        {additionalNotes && (
          <span className="text-sm/5">
            {/* The comma is for a screen reader: "Philcoa, via Almar" reads as two things. */}
            <span className="sr-only">, </span>
            {additionalNotes}
          </span>
        )}
      </span>
    </button>
  );
}
