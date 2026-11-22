import { useState } from 'react';

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
import type { RouteCardEndPoint, RouteCardRide } from './route-card-ride';
import { MODE_LABEL } from './route-modes';
import { RAILWAY_LIVERY } from '../model/liveries';

interface RouteCardProps {
  ride: RouteCardRide;
  /** Selected: pressed in under the Selected shadow while the map lights its routes alone. */
  state?: 'rest' | 'selected';
  /** Figma's Route Origin: the place the card's routes leave from. */
  routeOrigin: string;
  /** One row per direction leaving it, in the order given; every one is shown, and the card grows. */
  endPoints: readonly RouteCardEndPoint[];
  /**
   * A tap on the card outside its rows: select it, or let it go. The studio's alone (its editors
   * keep Selected); without it, as on the public map, that tap opens the first row's trip.
   */
  onSelect?: () => void;
  /** A row was tapped: open that direction. */
  onPick: (id: string) => void;
  /** The suites' name for it — `<testId>-origin`, `-select`, `-item` — in the list or a hotspot's card. */
  testId: 'chooser' | 'card';
}

/**
 * A place and the routes that leave it on one ride, in its colours (RouteCard, 4629:22776): what
 * they ride (RouteCardMode), the place in Bold 28/32, and a DestinationRow per place it goes to. A
 * train card has station codes by the origin and each row. A row opens its trip; a tap elsewhere
 * opens the first row's (the owner, 2026-11-22), the card pressed in under CARD_SHADOW_SELECTED
 * while the finger is down; at a sheet's Low it opens too (`data-opens-at-low`). With `onSelect`
 * (the studio's), that tap selects the card instead, or lets it go, and Selected wears the shadow.
 */
export function RouteCard({
  ride,
  state = 'rest',
  routeOrigin,
  endPoints,
  onSelect,
  onPick,
  testId,
}: RouteCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const isSelected = state === 'selected';
  const first = endPoints[0];
  const isRail = ride.kind === 'rail';
  const livery = isRail ? RAILWAY_LIVERY[ride.railway] : ride.livery;
  const vehicle = isRail ? ride.railway : ride.vehicle;

  return (
    <div
      data-testid={`${testId}-origin`}
      data-livery={livery}
      data-state={state}
      data-opens-at-low={onSelect ? undefined : ''}
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
            aria-pressed={onSelect ? isSelected : undefined}
            aria-label={onSelect || !first ? undefined : `${routeOrigin}, to ${first.destination}`}
            onClick={onSelect ?? (() => first && onPick(first.id))}
            onPointerDown={() => setIsPressed(true)}
            onPointerUp={() => setIsPressed(false)}
            onPointerCancel={() => setIsPressed(false)}
            onPointerLeave={() => setIsPressed(false)}
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
          isSelected || isPressed ? CARD_SHADOW_SELECTED[livery] : ROUTE_CARD_REST_SHADOW[livery],
        )}
      />
    </div>
  );
}
