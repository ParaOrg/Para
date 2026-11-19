import type { ReactNode } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { ArrowUpDownIcon, EndIcon, StartIcon } from '@/shared/ui/route-icons';

interface TripEndsCardProps {
  /** Figma's Route Origin: where the trip leaves from, on the Start card. */
  routeOrigin: string;
  /** Figma's routeDirection: where it goes, on the End card. */
  routeDirection: string;
  /** The place the trip passes on its way, shown as "via …" under End's place. Absent: no line. */
  via?: string;
  /**
   * The way ⇅ leads to, switchWord's (Pabalik, Papunta, a train's other bound): its name and
   * tooltip. Null: a loop, which has no way back, so it shows the Start card alone.
   */
  way: string | null;
  /** False when the other way round has nothing drawn; ⇅ then rests disabled. */
  isSwitchable: boolean;
  /** ⇅: the same trip the other way, as the bar's PAPUNTA does. */
  onSwitch: () => void;
}

/**
 * A trip's two ends at the top of its detail (TopContent, 4796:33201): a Start card and an End
 * card, 8 apart, with ⇅ between them at the right. A loop shows the Start card alone. Figma's
 * Mobile and Desktop draw the same cards; on a sheet at Low each place keeps to one line.
 */
export function TripEndsCard({
  routeOrigin,
  routeDirection,
  via,
  way,
  isSwitchable,
  onSwitch,
}: TripEndsCardProps) {
  if (way === null) {
    return (
      <div data-testid="trip-ends" className="flex w-full flex-col font-sn-pro">
        <EndCard sign={<StartIcon />} label="Start" place={routeOrigin} />
      </div>
    );
  }

  return (
    <div data-testid="trip-ends" className="flex w-full flex-col font-sn-pro">
      <EndCard sign={<StartIcon />} label="Start" place={routeOrigin} isClearOfSwitch />
      {/* The 8 between the cards, holding ⇅ across it, 12 in from their right edge. */}
      <div className="relative z-10 h-2">
        <span className="absolute top-1/2 right-3 flex -translate-y-1/2">
          <IconButton
            size="base"
            icon={<ArrowUpDownIcon />}
            label={way}
            tooltip="right"
            data-testid="trip-ends-switch"
            disabled={!isSwitchable}
            onClick={onSwitch}
          />
        </span>
      </div>
      <EndCard sign={<EndIcon />} label="End" place={routeDirection} via={via} />
    </div>
  );
}

interface EndCardProps {
  sign: ReactNode;
  label: 'Start' | 'End';
  place: string;
  via?: string;
  /** The Start card's place ends clear of ⇅, which overlaps the card's foot. */
  isClearOfSwitch?: boolean;
}

const SIGN_COLOUR = {
  Start: 'text-direction-start-fill',
  End: 'text-direction-end-fill',
} satisfies Record<EndCardProps['label'], string>;

/**
 * One end: its sign and label, Medium 12/16, over its place, Bold 18/26, and End's via line.
 * Figma's leading/7 is 26 where Tailwind's /7 is 28, hence /6.5.
 */
function EndCard({ sign, label, place, via, isClearOfSwitch = false }: EndCardProps) {
  return (
    <div className="flex w-full flex-col gap-1 rounded-2xl bg-bg-fill px-2.5 pt-2.5 pb-2 shadow-trip-end-card">
      <p className="flex items-center gap-1.5 text-xs/4 font-medium text-text-secondary">
        <span aria-hidden className={'flex size-4 shrink-0 *:size-full ' + SIGN_COLOUR[label]}>
          {sign}
        </span>
        {label}
      </p>
      <div className="flex flex-col break-words text-text-primary">
        <p
          className={
            'text-lg/6.5 font-bold sheet-low:line-clamp-1' + (isClearOfSwitch ? ' pr-12' : '')
          }
        >
          {place}
        </p>
        {via !== undefined && <p className="text-sm/5 font-medium">via {via}</p>}
      </div>
    </div>
  );
}
