import { cn } from '@/shared/utils/cn';

import { DestinationRow } from './destination-row';
import { CARD_BLOB, CARD_SHADOW_SELECTED } from './livery-card';
import { RouteBadge } from './route-badge';
import {
  CARD_INK,
  ROUTE_CARD_BLOB_PLACE,
  ROUTE_CARD_FILL,
  ROUTE_CARD_REST_SHADOW,
} from './route-card-look';
import { RouteCardMode } from './route-card-mode';
import { MODE_LABEL } from './route-modes';
import { RAILWAY_LIVERY, type RoadLivery } from '../model/liveries';
import type { Bound } from '../model/rail-codes';
import type { RailwayVehicle, RoadVehicle } from '../model/vehicles';

/** What a card's routes ride, which sets its colours and badges: a road mode's or a train line's. */
export type RouteCardRide =
  | {
      kind: 'road';
      livery: RoadLivery;
      /** The mode its badge names; null for a ride Figma draws no badge for (P2P, tricycle). */
      vehicle: RoadVehicle | null;
    }
  | {
      kind: 'rail';
      railway: RailwayVehicle;
      /** Which way the line's trains run; null on the ferry, or when it is not known. */
      bound: Bound | null;
      /** The origin's station code, `PL01`; null on the ferry, or a station the line's table does not know. */
      originCode: string | null;
    };

export interface RouteCardEndPoint {
  /** Which direction the row opens. */
  id: string;
  /** Figma's Destination: the place this direction goes to. */
  destination: string;
  /** Its route's via, under the place; null with none. */
  via: string | null;
  /** The station's code, `PL27`, at the row's end; null on a road card, the ferry, or an unknown station. */
  stationCode: string | null;
}

interface RouteCardProps {
  ride: RouteCardRide;
  /** Selected: pressed in under the Selected shadow while the map lights its routes alone. */
  state: 'rest' | 'selected';
  /** Figma's Route Origin: the place the card's routes leave from. */
  routeOrigin: string;
  /** One row per direction leaving it, in the order given; every one is shown, and the card grows. */
  endPoints: readonly RouteCardEndPoint[];
  /** A tap on the card outside its rows: select it, or let it go. */
  onSelect: () => void;
  /** A row was tapped: open that direction. */
  onPick: (id: string) => void;
  /** The suites' name for it — `<testId>-origin`, `-select`, `-item` — in the list or a hotspot's card. */
  testId: 'chooser' | 'card';
}

/**
 * A place and the routes that leave it on one ride, in its colours (RouteCard, 4629:22776): what
 * they ride (RouteCardMode), the place in Bold 28/32, and a DestinationRow per place it goes to. A
 * train card has station codes by the origin and each row. A row opens its trip; a tap elsewhere
 * selects the card, or lets it go. Figma draws no Selected card here: it wears CARD_SHADOW_SELECTED.
 */
export function RouteCard({
  ride,
  state,
  routeOrigin,
  endPoints,
  onSelect,
  onPick,
  testId,
}: RouteCardProps) {
  const isSelected = state === 'selected';
  const isRail = ride.kind === 'rail';
  const livery = isRail ? RAILWAY_LIVERY[ride.railway] : ride.livery;
  const vehicle = isRail ? ride.railway : ride.vehicle;

  return (
    <div
      data-testid={`${testId}-origin`}
      data-livery={livery}
      data-state={state}
      className={cn(
        'relative isolate flex w-full flex-col items-start gap-2 overflow-clip pt-3 pb-2 font-sn-pro',
        ROUTE_CARD_FILL[livery],
        CARD_INK[livery],
      )}
    >
      <img
        src={CARD_BLOB[livery].src}
        alt=""
        aria-hidden
        className={cn(ROUTE_CARD_BLOB_PLACE, CARD_BLOB[livery].className)}
      />
      {vehicle && (
        <div className="flex px-3">
          <RouteCardMode vehicle={vehicle} bound={isRail ? ride.bound : null} livery={livery} />
        </div>
      )}
      <div className="flex w-full flex-col">
        <div className="flex w-full items-center gap-2 px-3">
          {/* The name is the card's own target, stretched over all of it; the rows are drawn over
              that, so they keep their own taps. Long names wrap. At a sheet's Low, one line of it
              (sheetGesture's LOW_PX). */}
          <button
            type="button"
            data-testid={`${testId}-select`}
            aria-pressed={isSelected}
            onClick={onSelect}
            className="min-w-0 flex-1 text-left text-3xl/8 font-bold after:absolute after:inset-0 sheet-low:line-clamp-1"
          >
            {routeOrigin}
          </button>
          {isRail && ride.originCode && <RouteBadge label={ride.originCode} livery={livery} />}
        </div>
        <ul aria-label={vehicle ? MODE_LABEL[vehicle] : undefined} className="flex w-full flex-col">
          {endPoints.map((e) => (
            <li key={e.id}>
              {/* `relative`: positioned after the name's stretched target, so drawn over it. */}
              <DestinationRow
                destination={e.destination}
                additionalNotes={e.via && `Via ${e.via}`}
                livery={livery}
                on="card"
                slot={e.stationCode && <RouteBadge label={e.stationCode} livery={livery} />}
                data-testid={`${testId}-item`}
                data-direction={e.id}
                onClick={() => onPick(e.id)}
                className="relative"
              />
            </li>
          ))}
        </ul>
      </div>
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0',
          isSelected ? CARD_SHADOW_SELECTED[livery] : ROUTE_CARD_REST_SHADOW[livery],
        )}
      />
    </div>
  );
}
