import { useId, useRef, type ReactNode } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { ChevronLeftLargeIcon, CloseLargeIcon, FilterIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { WAY_TEST_ID, WIDE_BAR, type ControllerOwner } from './controller-look';
import { ModeFilterCard } from './mode-filter-card';
import { WayButton } from './way-button';
import type { Livery } from '../model/liveries';
import { MODE_FILTER_LABEL, type ModeFilterControl } from '../model/mode-filter';

interface RouteListControllerProps {
  owner: ControllerOwner;
  /** PAPUNTA's word: the way showing (wayWord), or a train's bound. Null: none, as loops have no way back. */
  way: string | null;
  /** False when the other way round has nothing drawn; PAPUNTA then rests disabled. */
  isSwitchable: boolean;
  /** Whether the way back is showing, for the suites (`data-back`). */
  isBack: boolean;
  onSwitch: () => void;
  /** The wide bar's colour: the trip's livery. None: the list's. */
  livery?: Livery;
  /** The filter the sliders open, kept by the caller, who lights the map to match; none, no sliders. */
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
 * PAPUNTA, over a fade (Gradient/bottom-toolbar, 4679:23737). Where the sheet floats it is the
 * sheet's top bar, 64 tall (4683:32635), in the list's colour or the trip's: PAPUNTA and the
 * sliders at the left, ‹ or ✕ at the right. The page reads it in that order, PAPUNTA first; on a
 * phone ‹ or ✕ is drawn first. ‹ stands when something is behind, ✕ when nothing is. A filter on
 * puts a dot on the sliders, and their name says which, so the dot is never the only sign.
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
        WIDE_BAR[livery ?? 'list'],
      )}
    >
      <div className="flex justify-center">
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
      {/* The side buttons stand 6 off PAPUNTA's foot on a phone, as Figma's spacers lift them;
          their tooltips point inward, which fits both bars. */}
      <div className="mb-1.5 flex justify-start gap-3 sheet-floating:mb-0">
        {modeFilter && (
          <span className="relative flex">
            <IconButton
              icon={<BarIcon icon={<FilterIcon />} />}
              label={isFiltered ? `Filter: ${MODE_FILTER_LABEL[filter]}` : 'Filter'}
              tooltip="left"
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
      <div className="order-first mb-1.5 flex justify-end sheet-floating:order-none sheet-floating:mb-0 sheet-floating:ml-auto">
        <IconButton
          icon={<BarIcon icon={onBack ? <ChevronLeftLargeIcon /> : <CloseLargeIcon />} />}
          label={onBack ? 'Back' : 'Close'}
          tooltip="right"
          onClick={onBack ?? onClose}
        />
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
