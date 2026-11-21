import type { ReactNode } from 'react';

import { ReloadIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';
import { kmLabel } from '@/shared/utils/geo';

import { FREE, farePesos, type Fare } from './trip-fare';
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

interface TileProps {
  name: string;
  children: ReactNode;
}

/** One tile (4821:38784): its figure, SemiBold 18/26, over its name, Regular 12/16. */
function Tile({ name, children }: TileProps) {
  return (
    <div className={TILE}>
      <span className={FIGURE}>{children}</span>
      <span className={NAME}>{name}</span>
    </div>
  );
}

interface FareTileProps {
  shown: Fare;
  kind: string;
  isDiscounted: boolean;
  turns: number;
  onTurn: () => void;
}

/** The fare: Free on its own, or the pesos, a button that turns them Regular ↔ Discounted. */
function FareTile({ shown, kind, isDiscounted, turns, onTurn }: FareTileProps) {
  if (shown === FREE) {
    return (
      <div className={TILE}>
        <span data-testid="trip-fare" className={FIGURE}>
          Free
        </span>
        <span className={NAME}>Fare</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      data-testid="trip-fare-turn"
      // The words on the tile first, as they read, so saying them reaches the button.
      aria-label={`${farePesos(shown, isDiscounted)} ${kind}. Show the ${isDiscounted ? 'regular' : 'discounted'} fare`}
      onClick={onTurn}
      className={cn(TILE, PRESSABLE)}
    >
      <span data-testid="trip-fare" className={FIGURE}>
        {farePesos(shown, isDiscounted)}
      </span>
      <span className={cn(NAME, 'flex items-center gap-2')}>
        {kind}
        <span
          aria-hidden
          style={{ rotate: `${turns * 360}deg` }}
          className="size-4 shrink-0 transition-[rotate] duration-turn ease-move *:size-full motion-reduce:transition-none"
        >
          <ReloadIcon />
        </span>
      </span>
    </button>
  );
}

const TILE = 'flex min-w-0 flex-1 basis-0 flex-col items-center gap-0.5 overflow-clip';
const FIGURE = 'w-full text-lg/6.5 font-semibold text-text-primary';
const NAME = 'text-xs/4 text-text-tertiary';
// Figma draws no hover or pressed state for the fare's button; bg/fill/fill-secondary stands in
// until the owner draws one.
const PRESSABLE =
  'transition-colors duration-quick ease-move hover:bg-bg-fill-secondary active:bg-bg-fill-secondary';
