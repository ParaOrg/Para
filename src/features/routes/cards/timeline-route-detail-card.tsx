import type { ReactNode, Ref } from 'react';

import { BottomSheet, type SheetHeight } from '@/shared/ui/bottom-sheet';

import { ROUTE_SHEET_SHAPE } from './route-sheet-shape';
import { TripDetail, type TripDetailProps } from './trip-detail';
import { TripEndsCard } from './trip-ends-card';
import { TripMoreRoutes, type OtherRoute } from './trip-more-routes';

type Props = TripDetailProps & {
  onSwitch: () => void; // ⇅ on the ends card: the same route the other way, unless not `switchable`.
  switchable: boolean;
  /** Where ⇅ leads (switchWord), which it says after its name. Null on a loop. */
  wayTo: string | null;
  /** The route's via, under End's place (TripEndsCard); absent with none. */
  via?: string;
  /** The sheet's name for a screen reader, where `origin → destination` does not say it (a loop's). */
  label?: string;
  /** A loop's name, for its ends card (TripEndsCard); absent on any other trip. */
  loopName?: string;
  /** Escape and a pull down from Low, as for any sheet. It has no ✕ (Figma 4831:51289): the map tapped takes it away. */
  onClose: () => void;
  /** The dock the card sits in, for the map to glide clear of it. */
  dockRef?: Ref<HTMLDivElement>;
  /** Its height, shared with the list or card it was opened from (BottomSheet). */
  height?: SheetHeight;
  /** The other routes out of where this trip starts, behind "View N more destinations" at the top. Empty or omitted, none. */
  otherRoutes?: readonly OtherRoute[];
  /** A row tapped: that route's trip in this one's place. */
  onOtherRoute?: (id: string) => void;
  /** Last: what only the studio shows — its facts and its Edit, Extend and Delete. */
  children?: ReactNode;
};

/**
 * One direction as a trip (RouteDetail, 4796:30411) on its sheet: its ends (TripEndsCard), "View N more destinations" under them (TripMoreRoutes) when other
 * routes leave from where it starts, then its body (TripDetail): what it rides, its tiles, its stops.
 */
export function TimelineRouteDetailCard({
  onSwitch,
  switchable,
  wayTo,
  via,
  label,
  loopName,
  onClose,
  dockRef,
  height,
  otherRoutes = [],
  onOtherRoute,
  children,
  ...detail
}: Props) {
  const { routeOrigin, routeDirection } = detail;
  const name = label ?? `${routeOrigin} → ${routeDirection}`;
  return (
    <BottomSheet
      ref={dockRef}
      height={height}
      label={name}
      testId="card"
      onClose={onClose}
      // Docked the map's whole height on the left on a wide screen, as the list is (Figma 4796:33161).
      floats="dock"
      shape={ROUTE_SHEET_SHAPE}
      // No notch drawn, as Figma draws none (4885:42925); the handle stays for the keyboard.
      handle="hidden"
      header={null}
    >
      {/* The trip's name as its heading, over the cards' own, for a screen reader; nothing is drawn. */}
      <h2 className="sr-only">{name}</h2>
      <TripMoreRoutes
        ends={
          <TripEndsCard
            routeOrigin={routeOrigin}
            routeDirection={routeDirection}
            via={via}
            loopName={loopName}
            way={wayTo}
            isSwitchable={switchable}
            onSwitch={onSwitch}
          />
        }
        from={routeOrigin}
        routes={onOtherRoute ? otherRoutes : []}
        onRoute={(id) => onOtherRoute?.(id)}
      >
        <TripDetail {...detail} via={via} />
      </TripMoreRoutes>
      {children}
    </BottomSheet>
  );
}
