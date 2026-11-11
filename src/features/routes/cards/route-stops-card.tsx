import type { ReactNode } from 'react';

import { ChevronDownIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { CARD_SHADOW, CARD_SURFACE, CARD_TEXT } from './livery-card';
import type { Livery } from '../model/liveries';

/** RouteStopsCardShadow (4681:29139), each livery lifted in its own surface. */
const STOPS_CARD_SHADOW = {
  jeep: 'shadow-route-stops-card-jeep',
  'uv-express': 'shadow-route-stops-card-uv-express',
  ejeep: 'shadow-route-stops-card-ejeep',
  bus: 'shadow-route-stops-card-bus',
  'light-rail-way-one': 'shadow-route-stops-card-light-rail-way-one',
  'light-rail-way-two': 'shadow-route-stops-card-light-rail-way-two',
  'metro-rail-way-three': 'shadow-route-stops-card-metro-rail-way-three',
  ferry: 'shadow-route-stops-card-ferry',
} satisfies Record<Livery, string>;

interface RouteStopsCardProps {
  livery: Livery;
  /** At its top, what the trip rides (RouteStopsCardHeader); none on a trip that has no header yet. */
  header?: ReactNode;
  /** The stops, the timeline's rows: an `<ol>` of them. */
  children: ReactNode;
  /**
   * Figma's Behavior=Expand: every stop shown, "View less" on the card's foot. Folded (Shrink), the
   * card cut at 120, "View more". Without `onToggleStops`, nothing folds and there is no button.
   */
  isMaximized?: boolean;
  onToggleStops?: () => void;
}

/**
 * A trip's stops, in the trip's colour (RouteStopsCard, 4681:29139): what it rides at the top, then
 * the timeline, the card rounded 24, pressed in under its own Route/RouteCardPrimary (or Inverse,
 * on a light card) and lifted off the page in its own colour. "View less" sits on its foot, half
 * over it, white, and opens or folds every stop the timeline folds.
 */
export function RouteStopsCard({
  livery,
  header,
  children,
  isMaximized = false,
  onToggleStops,
}: RouteStopsCardProps) {
  return (
    <div className="relative w-full">
      <div
        data-testid="trip"
        data-livery={livery}
        className={cn(
          'relative isolate flex w-full flex-col overflow-clip rounded-3xl py-0.5 font-sn-pro',
          CARD_SURFACE[livery],
          CARD_TEXT[livery],
          STOPS_CARD_SHADOW[livery],
          // Folded (Behavior=Shrink, 4681:29137): cut at 120, the first stop and the top of the next.
          onToggleStops && !isMaximized && 'max-h-30',
        )}
      >
        {header}
        {children}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 rounded-[inherit]',
            CARD_SHADOW[livery],
          )}
        />
      </div>
      {onToggleStops && (
        <div className="absolute inset-x-0 -bottom-3.5 flex justify-center">
          <button
            type="button"
            data-testid="trip-view-more"
            aria-expanded={isMaximized}
            onClick={onToggleStops}
            className="flex items-center gap-0.5 rounded-full bg-surface py-1 pr-1.5 pl-2.5 font-sn-pro text-sm/5 font-medium text-content-secondary shadow-large"
          >
            {isMaximized ? 'View less' : 'View more'}
            {/* One chevron, turned: Figma's chevron-up opened. */}
            <span
              aria-hidden
              className={cn(
                'size-5 shrink-0 transition-transform duration-quick ease-move *:size-full motion-reduce:transition-none',
                isMaximized && 'rotate-180',
              )}
            >
              <ChevronDownIcon />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
