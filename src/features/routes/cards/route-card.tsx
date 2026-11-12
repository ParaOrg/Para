import { cn } from '@/shared/utils/cn';

import { CARD_BLOB, CARD_SHADOW, CARD_SHADOW_SELECTED } from './livery-card';
import { RouteBadge } from './route-badge';
import { ROUTE_CARD_BLOB_PLACE, ROUTE_CARD_SURFACE, ROUTE_CARD_TEXT } from './route-card-look';
import { RouteCardMode } from './route-card-mode';
import { RouteEndPointBar } from './route-end-point-bar';
import { MODE_LABEL } from './route-modes';
import { RAILWAY_LIVERY, type RoadLivery } from '../model/liveries';
import type { Bound } from '../model/rail-codes';
import type { RailwayVehicle, RoadVehicle } from '../model/vehicles';

/**
 * What a card's routes ride, which sets its colours and its badges: a road mode's card, in the
 * livery its routes wear, or a train line's or the ferry's, in the line's own.
 */
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
  /** Figma's routeDirection: the place this direction goes to. */
  routeDirection: string;
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
  /**
   * What the suites call the card and its parts — `<testId>-origin`, its name `<testId>-select`,
   * its rows `<testId>-item` — `chooser` in the route list, `card` in a hotspot's card.
   */
  testId: 'chooser' | 'card';
}

/**
 * A place and the routes that leave it on one ride, in that ride's colours (RouteCard, 4629:22776):
 * what they ride at the top (RouteCardMode: the vehicle and its badge, and a train's bound), the
 * place in Bold 24/32, and a row for each place it goes to (RouteEndPointBar), joined to it by a
 * tree line. A train card has the station codes beside the origin and at each row's end. A place
 * with several rides has a card for each (routeCards).
 *
 * A row opens its trip straight away; a tap anywhere else on the card selects it, or lets it go.
 * Which card is Selected, one at a time, is the caller's to keep.
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
        'relative isolate flex w-full flex-col items-start gap-0.5 overflow-clip border-y-0-6 pt-3 pb-2 font-sn-pro',
        ROUTE_CARD_SURFACE[livery],
        ROUTE_CARD_TEXT[livery],
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
            className="min-w-0 flex-1 text-left text-2xl/8 font-bold after:absolute after:inset-0 sheet-low:line-clamp-1"
          >
            {routeOrigin}
          </button>
          {isRail && ride.originCode && <RouteBadge label={ride.originCode} livery={livery} />}
        </div>
        <ul aria-label={vehicle ? MODE_LABEL[vehicle] : undefined} className="flex w-full flex-col">
          {endPoints.map((e, index) => (
            <li key={e.id}>
              {/* `relative`: positioned after the name's stretched target, so drawn over it. */}
              <RouteEndPointBar
                routeDirection={e.routeDirection}
                on={livery}
                size="medium"
                position={index === endPoints.length - 1 ? 'bottom' : 'top'}
                slot={
                  e.stationCode && (
                    <>
                      <span className="sr-only">, </span>
                      <RouteBadge label={e.stationCode} livery={livery} />
                    </>
                  )
                }
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
          isSelected ? CARD_SHADOW_SELECTED[livery] : CARD_SHADOW[livery],
        )}
      />
    </div>
  );
}
