import type { ReactNode } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { ChevronLeftLargeIcon, CloseLargeIcon, FilterLargeIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { WAY_TEST_ID, WIDE_BAR, type ControllerOwner } from './controller-look';
import { ModeFilterButton } from './mode-filter-button';
import { WayButton } from './way-button';
import type { Livery } from '../model/liveries';
import type { ModeFilterControl } from '../model/mode-filter';

interface RouteListControllerProps {
  owner: ControllerOwner;
  /** PAPUNTA's word: the way showing (wayWord), or a train's bound. Null: none, as loops have no way back. */
  way: string | null;
  /** Where a tap leads (switchWord), PAPUNTA's spoken hint. */
  wayTo: string | null;
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
 * The bar of a route list and a trip in the studio (Controller): ‹ or ✕, PAPUNTA, then the sliders
 * (the list's filter, ModeFilterButton) and an extra slot. The public map has none: its list and
 * trip float their controls on the map (MapControlsDock). On a phone it floats at the sheet's
 * foot, centred on PAPUNTA, over a fade (Gradient/bottom-toolbar, 4679:23737). Where the sheet
 * floats it is the sheet's top bar, 64 tall (4683:32635), in the list's colour or the trip's: PAPUNTA and the
 * sliders at the left, ‹ or ✕ at the right. The page reads it in that order, PAPUNTA first; on a
 * phone ‹ or ✕ is drawn first. ‹ stands when something is behind, ✕ when nothing is.
 */
export function RouteListController({
  owner,
  way,
  wayTo,
  isSwitchable,
  isBack,
  onSwitch,
  livery,
  modeFilter,
  extra,
  onBack,
  onClose,
}: RouteListControllerProps) {
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
        {way !== null && wayTo !== null && (
          <WayButton
            way={way}
            wayTo={wayTo}
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
          <ModeFilterButton
            modeFilter={modeFilter}
            icon={<BarIcon icon={<FilterLargeIcon />} />}
            tooltip="left"
            testId={`${owner}-filter`}
          />
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
