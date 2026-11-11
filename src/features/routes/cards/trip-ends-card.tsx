import type { ReactNode } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { ArrowUpDownIcon, EndIcon, StartIcon } from '@/shared/ui/route-icons';

interface TripEndsCardProps {
  /** Figma's Route Origin: where the trip leaves from, after Start's S. */
  routeOrigin: string;
  /** Figma's routeDirection: where it goes, after End's E. */
  routeDirection: string;
  /**
   * The way ⇅ leads to, switchWord's (Pabalik, Papunta, a train's other bound): its name and
   * tooltip. Null: no ⇅, for a loop has no way back.
   */
  way: string | null;
  /** False when the other way round has nothing drawn; ⇅ then rests disabled. */
  isSwitchable: boolean;
  /** ⇅: the same trip the other way, as the bar's PAPUNTA does. */
  onSwitch: () => void;
}

/**
 * A trip's two ends at the top of it (RouteTripDetail, 4681:32026): Start's S and the origin, a
 * hairline, End's E and the destination, Medium 17/24, on a white card rounded 24 under
 * shadow-large; ⇅ at the right, between them, turns the trip round.
 */
export function TripEndsCard({
  routeOrigin,
  routeDirection,
  way,
  isSwitchable,
  onSwitch,
}: TripEndsCardProps) {
  return (
    <div
      data-testid="trip-ends"
      className="relative flex w-full flex-col overflow-clip rounded-3xl bg-surface font-sn-pro shadow-large"
    >
      <EndRow sign={<StartIcon />} signColour="text-trip-start" place={routeOrigin} word="start" />
      <hr className="border-t-0-6 border-border-secondary" />
      <EndRow sign={<EndIcon />} signColour="text-trip-end" place={routeDirection} word="end" />
      {way !== null && (
        <span className="absolute top-1/2 right-3 flex -translate-y-1/2">
          <IconButton
            size="small"
            icon={<ArrowUpDownIcon />}
            label={way}
            tooltip="right"
            data-testid="trip-ends-switch"
            disabled={!isSwitchable}
            onClick={onSwitch}
          />
        </span>
      )}
    </div>
  );
}

interface EndRowProps {
  sign: ReactNode;
  /** Its letter's disc: trip-start's green or trip-end's red. */
  signColour: 'text-trip-start' | 'text-trip-end';
  place: string;
  /** What the sign says, for a screen reader: the sign itself is for the eye. */
  word: 'start' | 'end';
}

/** One end: its sign, 20, and its place, 14 above and below, leaving room for ⇅ at the right. */
function EndRow({ sign, signColour, place, word }: EndRowProps) {
  return (
    <p className="flex items-center gap-2 pr-14 pl-4">
      <span aria-hidden className={'flex size-5 shrink-0 *:size-full ' + signColour}>
        {sign}
      </span>
      <span className="min-w-0 flex-1 py-3.5 text-base/6 font-medium text-content-primary">
        <span className="sr-only">{word === 'start' ? 'From ' : 'To '}</span>
        {/* At a sheet's Low, one line of it (sheetGesture's LOW_PX); raised, all of it. */}
        <span className="block sheet-low:line-clamp-1">{place}</span>
      </span>
    </p>
  );
}
