import { useId } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';
import { SwitchVerticalIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { RouteStopSign, type RouteStopSignKind } from './route-stop-sign';

interface TripEndsCardProps {
  /** Figma's Route Origin: where the trip leaves from, under Start. */
  routeOrigin: string;
  /** Figma's routeDirection: where it goes, under End. */
  routeDirection: string;
  /** The place the trip passes on its way, shown as "via …" under End's place. Absent: no line. */
  via?: string;
  /** A loop's name, "UP – Ikot": its one place on the card, under the Ikot pill. Absent: not a loop. */
  loopName?: string;
  /** The way ⇅ leads to, switchWord's (Pabalik, Papunta, a train's other bound): its name and tooltip. */
  way: string | null;
  /** False when the other way round has nothing drawn; ⇅ then rests disabled. */
  isSwitchable: boolean;
  /** ⇅: the same trip the other way round. */
  onSwitch: () => void;
}

/**
 * A trip's two ends at the top of its detail (TopContent, 4796:30411): one card, white and rounded
 * 24 under shadow-large, Start's place over a hairline (stroke-tertiary) and End's under it. A loop
 * (Variants=Ikot) shows its name alone, under its Ikot pill, and no ⇅: it has no way back. ⇅ sits
 * on the hairline, 12 in from the right (4831:51875), and turns the trip round. On a sheet at Low
 * each place keeps to one line.
 */
export function TripEndsCard({
  routeOrigin,
  routeDirection,
  via,
  loopName,
  way,
  isSwitchable,
  onSwitch,
}: TripEndsCardProps) {
  const hintId = useId();
  if (loopName !== undefined) {
    return (
      <div data-testid="trip-ends" className={CARD}>
        <EndPart kind="ikot" place={loopName} />
      </div>
    );
  }
  return (
    <div data-testid="trip-ends" className={CARD}>
      <EndPart kind="start" place={routeOrigin} isClearOfSwitch={way !== null} />
      <div className="relative">
        <hr className="border-t-0-6 border-stroke-tertiary" />
        {way !== null && (
          <span className="absolute top-1/2 right-3 z-10 flex -translate-y-1/2">
            <IconButton
              size="base"
              icon={<SwitchVerticalIcon />}
              label={way}
              tooltip="right"
              data-testid="trip-ends-switch"
              aria-describedby={hintId}
              disabled={!isSwitchable}
              onClick={onSwitch}
            />
            {/* The hint's words: the name says where a tap leads, this that it turns there. */}
            <span id={hintId} className="sr-only">
              turns to {way}
            </span>
          </span>
        )}
      </div>
      <EndPart kind="end" place={routeDirection} via={via} />
    </div>
  );
}

const CARD = 'flex w-full flex-col overflow-clip rounded-3xl font-sn-pro shadow-large';

interface EndPartProps {
  kind: RouteStopSignKind;
  place: string;
  via?: string;
  /** Start's place ends clear of ⇅, which overlaps the part's foot. */
  isClearOfSwitch?: boolean;
}

/** One end, 12 in: its pill (RouteStopSign), then its place, SemiBold 20/28, and End's via line. */
function EndPart({ kind, place, via, isClearOfSwitch = false }: EndPartProps) {
  return (
    <div className="flex w-full flex-col items-start gap-0.5 bg-bg-fill p-3">
      <RouteStopSign kind={kind} />
      <div className="flex w-full flex-col break-words text-text-primary">
        <p
          className={cn(
            'text-xl/7 font-semibold sheet-low:line-clamp-1',
            isClearOfSwitch && 'pr-12',
          )}
        >
          {place}
        </p>
        {via !== undefined && <p className="text-sm/5">via {via}</p>}
      </div>
    </div>
  );
}
