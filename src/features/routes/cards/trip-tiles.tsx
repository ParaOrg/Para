import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';
import { kmLabel } from '@/shared/utils/geo';

import type { Fare } from './trip-fare';
import { FareTile } from './trip-fare-tile';
import { Tile } from './trip-tile';
import { FIGURE, NAME } from './trip-tile-look';
import { travelLabel, travelSpoken, type TravelEstimate } from '../model/travel-time';

interface TripTilesProps {
  /** The fare the tile shows, or FREE; undefined when unpriced, and the tile with it. */
  shown: Fare | undefined;
  shownMetres: number;
  /** Whether the tile shows the Discounted fare. */
  isDiscounted: boolean;
  /** How many times the fare tile was tapped: ↻ turns once more for each. */
  turns: number;
  /** The fare tile was tapped: turn it to the other fare. */
  onTurn: () => void;
  /** The ride's estimated minutes (estimateTravel); omitted, no Estimated Time Arrival tile. */
  estimate?: TravelEstimate;
  /** What the trip rides, "Jeep", "LRT Line 1"; omitted, no Transport mode tile. */
  transportMode?: string;
  /** A train's bound, "Southbound", on its own row at the top; omitted on every other trip. */
  bound?: string;
}

/**
 * The ride's facts (BottomContent, 4821:40538), in rows split by hairlines: a train's Direction
 * on its own, then the fare and the Estimated Time Arrival, then the Transport mode and the
 * Distance, a hairline between each pair too. Unpriced, the Estimated Time Arrival takes its row.
 */
export function TripTiles({
  shown,
  shownMetres,
  isDiscounted,
  turns,
  onTurn,
  estimate,
  transportMode,
  bound,
}: TripTilesProps) {
  const kind = isDiscounted ? 'Discounted fare' : 'Regular fare';
  const fare = shown !== undefined && (
    <FareTile shown={shown} kind={kind} isDiscounted={isDiscounted} turns={turns} onTurn={onTurn} />
  );
  const eta = estimate && (
    <Tile name="Estimated Time Arrival">
      <span data-testid="trip-time">
        <span aria-hidden>{travelLabel(estimate)}</span>
        <span className="sr-only">{travelSpoken(estimate)}</span>
      </span>
    </Tile>
  );
  const mode = transportMode !== undefined && (
    <Tile name="Transport mode">
      <span data-testid="trip-mode">{transportMode}</span>
    </Tile>
  );
  const distance = (
    <Tile name="Distance">
      <span data-testid="trip-km">{kmLabel(shownMetres)}</span>
    </Tile>
  );
  // Unpriced on a mode the design draws no vehicle for, Distance is the one tile, and its row
  // takes the first row's room.
  const hasTopRow = Boolean(fare || eta);
  return (
    <div data-testid="trip-tiles" className="flex w-full flex-col text-center font-sn-pro">
      {bound !== undefined && (
        <div className="flex flex-col items-center gap-0.5 border-b-0-6 border-stroke-secondary pb-4">
          <span data-testid="trip-bound" className={FIGURE}>
            {bound}
          </span>
          <span className={NAME}>Direction</span>
        </div>
      )}
      {hasTopRow && (
        <TileRow isFirst>
          {fare}
          {eta}
        </TileRow>
      )}
      <TileRow isFirst={!hasTopRow}>
        {mode}
        {distance}
      </TileRow>
    </div>
  );
}

interface TileRowProps {
  /** The first row under the signboard or Direction: 20 over its figures, as Figma pads it. */
  isFirst?: boolean;
  children: ReactNode;
}

/** A row of one or two tiles, a hairline under it, and between two of them. */
function TileRow({ isFirst = false, children }: TileRowProps) {
  return (
    <div
      className={cn(
        'flex w-full border-b-0-6 border-stroke-secondary *:not-first:border-l-0-6 *:not-first:border-stroke-secondary',
        isFirst ? '*:pt-5 *:pb-4' : '*:py-4',
      )}
    >
      {children}
    </div>
  );
}
