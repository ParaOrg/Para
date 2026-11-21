import { RouteStopSign } from './route-stop-sign';

interface TripEndsCardProps {
  /** Figma's Route Origin: where the trip leaves from, under Start. */
  routeOrigin: string;
  /** Figma's routeDirection: where it goes, under End. */
  routeDirection: string;
  /** The place the trip passes on its way, shown as "via …" under End's place. Absent: no line. */
  via?: string;
  /** A loop's origin and destination are one place, so it shows Start alone. */
  isLoop?: boolean;
}

/**
 * A trip's two ends at the top of its detail (TopContent, 4796:30411): one card, white and rounded
 * 24 under shadow-large, Start's place over a hairline (stroke-tertiary) and End's under it. A loop
 * shows Start alone. The bar's PAPUNTA turns the trip round; the card has no switch of its own. On
 * a sheet at Low each place keeps to one line.
 */
export function TripEndsCard({
  routeOrigin,
  routeDirection,
  via,
  isLoop = false,
}: TripEndsCardProps) {
  return (
    <div
      data-testid="trip-ends"
      className="flex w-full flex-col overflow-clip rounded-3xl font-sn-pro shadow-large"
    >
      <EndPart kind="start" place={routeOrigin} />
      {!isLoop && (
        <>
          <hr className="border-t-0-6 border-stroke-tertiary" />
          <EndPart kind="end" place={routeDirection} via={via} />
        </>
      )}
    </div>
  );
}

interface EndPartProps {
  kind: 'start' | 'end';
  place: string;
  via?: string;
}

/** One end, 12 in: its pill (RouteStopSign), then its place, SemiBold 20/28, and End's via line. */
function EndPart({ kind, place, via }: EndPartProps) {
  return (
    <div className="flex w-full flex-col items-start gap-0.5 bg-bg-fill p-3">
      <RouteStopSign kind={kind} />
      <div className="flex w-full flex-col break-words text-text-primary">
        <p className="text-xl/7 font-semibold sheet-low:line-clamp-1">{place}</p>
        {via !== undefined && <p className="text-sm/5">via {via}</p>}
      </div>
    </div>
  );
}
