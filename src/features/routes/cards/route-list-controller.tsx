import { useId, useRef, type ReactNode } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { ChevronLeftLargeIcon, CloseLargeIcon, FilterIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { ModeFilterCard } from './mode-filter-card';
import { WayButton } from './way-button';
import type { Livery } from '../model/liveries';
import { MODE_FILTER_LABEL, type ModeFilterControl } from '../model/mode-filter';

/** Whose bar it is, for the suites: the route list's (`chooser-…`) or a trip's (`card-…`). */
type ControllerOwner = 'chooser' | 'card';

/** PAPUNTA's test id, as the suites have long known each. */
const WAY_TEST_ID = {
  chooser: 'chooser-flip',
  card: 'card-switch',
} satisfies Record<ControllerOwner, string>;

/** The wide bar: brand blue on the list, and the trip's own livery on a trip, pressed in as its card. */
const WIDE_BAR = {
  brand: 'sheet-floating:bg-brand-surface sheet-floating:shadow-route-card-primary',
  jeep: 'sheet-floating:bg-card-jeep-surface sheet-floating:shadow-route-card-primary',
  'uv-express':
    'sheet-floating:bg-card-uv-express-surface sheet-floating:shadow-route-card-inverse',
  ejeep: 'sheet-floating:bg-card-ejeep-surface sheet-floating:shadow-route-card-inverse',
  bus: 'sheet-floating:bg-card-bus-surface sheet-floating:shadow-route-card-primary',
  'light-rail-way-one':
    'sheet-floating:bg-map-rail-light-rail-way-one-surface sheet-floating:shadow-route-card-primary',
  'light-rail-way-two':
    'sheet-floating:bg-map-rail-light-rail-way-two-surface sheet-floating:shadow-route-card-primary',
  'metro-rail-way-three':
    'sheet-floating:bg-map-rail-metro-rail-way-three-surface sheet-floating:shadow-route-card-primary',
  ferry: 'sheet-floating:bg-map-ferry-surface sheet-floating:shadow-route-card-primary',
} satisfies Record<Livery | 'brand', string>;

interface RouteListControllerProps {
  owner: ControllerOwner;
  /**
   * PAPUNTA's word: the way that is showing (wayWord), Papunta or Pabalik, or a train's bound. Null:
   * no PAPUNTA, for loops have no way back.
   */
  way: string | null;
  /** False when the other way round has nothing drawn; PAPUNTA then rests disabled. */
  isSwitchable: boolean;
  /** Whether the way back is showing, for the suites (`data-back`). */
  isBack: boolean;
  onSwitch: () => void;
  /** The wide bar's colour: the trip's livery. None: brand blue, as on the list. */
  livery?: Livery;
  /**
   * The filter the sliders open, kept by the caller, who lights the map to match; without one, no
   * sliders.
   */
  modeFilter?: ModeFilterControl;
  /** Figma's extra slot after PAPUNTA, for what is to come there (the report flag). */
  extra?: ReactNode;
  /** ‹: back to what this was opened from. Null or none: nothing behind, so ✕ stands there. */
  onBack?: (() => void) | null;
  onClose: () => void;
}

/**
 * The bar of a route list and a trip (Controller): ‹ or ✕, PAPUNTA, then the sliders (the list's
 * filter, ModeFilterCard) and an extra slot. On a phone it floats at the sheet's foot, centred on
 * PAPUNTA, over a fade (Gradient/bottom-toolbar, 4679:23737). Where the sheet floats on a wide
 * screen it is the sheet's top bar, 64 tall, brand blue on the list and the trip's colour on a
 * trip: PAPUNTA and the sliders at the left, ‹ or ✕ at the right (4683:32635).
 *
 * ‹ stands when something is behind, ✕ when nothing is: one way out at a time. PAPUNTA names the
 * way showing and turns it round (WayButton). While a filter is on, a dot sits on the sliders and
 * its name says which, so the dot is never the only sign.
 */
export function RouteListController({
  owner,
  way,
  isSwitchable,
  isBack,
  onSwitch,
  livery,
  modeFilter,
  extra,
  onBack,
  onClose,
}: RouteListControllerProps) {
  const filterCardId = useId();
  const filterCardRef = useRef<HTMLDivElement>(null);
  const filter = modeFilter?.filter ?? 'all';
  const isFiltered = filter !== 'all';
  return (
    <div
      data-testid={`${owner}-controller`}
      className={cn(
        'grid w-full grid-cols-[1fr_auto_1fr] items-end gap-3 bg-(image:--gradient-bottom-toolbar) px-3 pt-2 pb-6',
        'sheet-floating:flex sheet-floating:h-16 sheet-floating:items-center sheet-floating:bg-none sheet-floating:p-3',
        WIDE_BAR[livery ?? 'brand'],
      )}
    >
      {/* Raised 6 off PAPUNTA's foot on a phone, as Figma's spacers lift them. */}
      <div className="mb-1.5 flex justify-end sheet-floating:order-last sheet-floating:mb-0 sheet-floating:ml-auto">
        {onBack ? (
          <IconButton
            icon={<BarIcon icon={<ChevronLeftLargeIcon />} />}
            label="Back"
            tooltip="bottom"
            onClick={onBack}
          />
        ) : (
          <IconButton
            icon={<BarIcon icon={<CloseLargeIcon />} />}
            label="Close"
            tooltip="bottom"
            onClick={onClose}
          />
        )}
      </div>
      <div className="flex justify-center sheet-floating:order-first">
        {way !== null && (
          <WayButton
            way={way}
            data-testid={WAY_TEST_ID[owner]}
            data-back={isBack}
            disabled={!isSwitchable}
            onClick={onSwitch}
          />
        )}
      </div>
      <div className="mb-1.5 flex justify-start gap-3 sheet-floating:mb-0">
        {modeFilter && (
          <span className="relative flex">
            <IconButton
              icon={<BarIcon icon={<FilterIcon />} />}
              label={isFiltered ? `Filter: ${MODE_FILTER_LABEL[filter]}` : 'Filter'}
              tooltip="bottom"
              data-testid={`${owner}-filter`}
              popoverTarget={filterCardId}
            />
            {isFiltered && (
              <span
                aria-hidden
                className="pointer-events-none absolute top-0 right-0 size-3 rounded-full bg-brand-surface ring-2 ring-surface"
              />
            )}
          </span>
        )}
        {extra}
      </div>
      {modeFilter && (
        <ModeFilterCard
          id={filterCardId}
          ref={filterCardRef}
          filter={modeFilter.filter}
          onFilter={modeFilter.onFilter}
        />
      )}
    </div>
  );
}

interface BarIconProps {
  icon: ReactNode;
}

/** The bar's drawings: Content/primary on a phone, Brand/surface on the wide bar (Figma's overrides). */
function BarIcon({ icon }: BarIconProps) {
  return (
    <span className="flex text-content-primary *:size-full sheet-floating:text-brand-surface">
      {icon}
    </span>
  );
}
