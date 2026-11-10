import { useId, useRef, type ReactNode } from 'react';

import { IconButton, type TooltipPosition } from '@/design-system/primitives/icon-button';
import { ArrowLeftRightIcon, CloseLargeIcon, FilterIcon } from '@/shared/ui/route-icons';

import { ModeFilterCard } from './mode-filter-card';
import { MODE_FILTER_LABEL, type ModeFilterControl } from '../model/mode-filter';

type RouteListControllerLayout = 'row' | 'column' | 'auto';

interface RouteListControllerProps {
  /**
   * Figma's Property 1: Default, a row along a phone sheet's foot, ✕ at the left and ⇆ over the
   * filter at the right; Variant2, a column beside the list docked on a wide screen, ✕ then ⇆ and
   * the filter. `auto`: the row on a phone's sheet and the column where the sheet docks
   * (`sheet-floating:`), as the route list wears it.
   */
  layout: RouteListControllerLayout;
  /**
   * The way ⇆ leads to, switchWord's (Pabalik, Papunta, a train's other bound): its accessible
   * name and tooltip. Null: no ⇆, for loops have no way back.
   */
  way: string | null;
  /** False when the other way round has nothing drawn; ⇆ then rests disabled. */
  isSwitchable: boolean;
  /** Whether the way back is showing, for the suites (`data-back`). */
  isBack: boolean;
  onSwitch: () => void;
  /**
   * The filter the sliders open, kept by the caller, who lights the map to match; without one, no
   * sliders.
   */
  modeFilter?: ModeFilterControl;
  onClose: () => void;
}

const LAYOUT = {
  row: 'flex w-full items-end justify-between px-6 pb-8',
  column: 'flex w-22 flex-col items-center gap-2 px-5 pt-5 pb-8',
  auto:
    'flex w-full items-end justify-between px-6 pb-8 ' +
    'sheet-floating:w-22 sheet-floating:flex-col sheet-floating:items-center sheet-floating:justify-start sheet-floating:gap-2 sheet-floating:px-5 sheet-floating:pt-5',
} satisfies Record<RouteListControllerLayout, string>;

/**
 * Where the tooltips point from: above the row at a phone's foot, beside the column. `auto`, which
 * is either, points each bubble inward, to fit in both: ✕'s to its right, the others' to their
 * left, over the list where it docks.
 */
const CLOSE_TOOLTIP = { row: 'bottom', column: 'left', auto: 'left' } satisfies Record<
  RouteListControllerLayout,
  TooltipPosition
>;
const SIDE_TOOLTIP = { row: 'right', column: 'left', auto: 'right' } satisfies Record<
  RouteListControllerLayout,
  TooltipPosition
>;

/**
 * The route list's buttons (Controller, 4633:22010): ✕ closes the list, ⇆ shows every route the
 * other way round, and the sliders open the filter (ModeFilterCard). Each is the IconButton's
 * Special at Large, its drawing in Brand/surface. While a filter is on, a dot sits on the sliders
 * and its name says which, so the dot is never the only sign.
 */
export function RouteListController({
  layout,
  way,
  isSwitchable,
  isBack,
  onSwitch,
  modeFilter,
  onClose,
}: RouteListControllerProps) {
  const filterCardId = useId();
  const filterCardRef = useRef<HTMLDivElement>(null);
  const filter = modeFilter?.filter ?? 'all';
  const isFiltered = filter !== 'all';
  return (
    <div data-testid="chooser-controller" className={LAYOUT[layout]}>
      <IconButton
        size="large"
        icon={<BrandIcon icon={<CloseLargeIcon />} />}
        label="Close"
        tooltip={CLOSE_TOOLTIP[layout]}
        onClick={onClose}
      />
      <div className="flex flex-col items-center gap-4">
        {way !== null && (
          <IconButton
            size="large"
            icon={<BrandIcon icon={<ArrowLeftRightIcon />} />}
            label={way}
            tooltip={SIDE_TOOLTIP[layout]}
            data-testid="chooser-flip"
            data-back={isBack}
            disabled={!isSwitchable}
            onClick={onSwitch}
          />
        )}
        {modeFilter && (
          <span className="relative flex">
            <IconButton
              size="large"
              icon={<BrandIcon icon={<FilterIcon />} />}
              label={isFiltered ? `Filter: ${MODE_FILTER_LABEL[filter]}` : 'Filter'}
              tooltip={SIDE_TOOLTIP[layout]}
              data-testid="chooser-filter"
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

interface BrandIconProps {
  icon: ReactNode;
}

/** A drawing in Brand/surface, as the Controller's are (Figma overrides the IconButton's words). */
function BrandIcon({ icon }: BrandIconProps) {
  return <span className="flex text-brand-surface *:size-full">{icon}</span>;
}
