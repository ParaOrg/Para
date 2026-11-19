import type { ReactNode, Ref } from 'react';

import { BottomSheet, type SheetHeight } from '@/shared/ui/bottom-sheet';

import { RouteListController } from './route-list-controller';
import { TripDetail, type TripDetailProps } from './trip-detail';
import { TripEndsCard } from './trip-ends-card';
import { TripMoreRoutes, type OtherRoute } from './trip-more-routes';

type Props = TripDetailProps & {
  onSwitch: () => void; // PAPUNTA and ⇅: the same route the other way, unless not `switchable`.
  switchable: boolean;
  back: boolean; // The way back, for the suites (PAPUNTA's `data-back`).
  /** PAPUNTA's word (wayWord), the way showing, and ⇅'s name (switchWord), the way a tap leads to. Null on a loop. */
  way: string | null;
  wayTo: string | null;
  /** The sheet's name for a screen reader, where `origin → destination` does not say it (a loop's). */
  label?: string;
  /** ‹: back to what the trip was picked from — the list, a hotspot's card — or to its route with those sharing an end; null when there is none, and ✕ stands there. */
  onBackToList: (() => void) | null;
  onClose: () => void;
  /** The dock the card sits in, for the map to glide clear of it. */
  dockRef?: Ref<HTMLDivElement>;
  /** Its height, shared with the list or card it was opened from (BottomSheet). */
  height?: SheetHeight;
  /** The other routes out of where this trip starts, behind "View N more routes" at the top. Empty or omitted, none. */
  otherRoutes?: readonly OtherRoute[];
  /** A row tapped: that route's trip in this one's place. */
  onOtherRoute?: (id: string) => void;
  /** Last: what only the studio shows — its facts and its Edit, Extend and Delete. */
  children?: ReactNode;
};

/**
 * One direction as a trip (RouteDetail, 4796:30411) on its sheet, with the Controller's bar: its
 * ends (TripEndsCard), "View N more routes" under them (TripMoreRoutes) when other routes leave
 * from where it starts, then its body (TripDetail): what it rides, its tiles, its stops.
 */
export function TimelineRouteDetailCard({
  onSwitch,
  switchable,
  back,
  way,
  wayTo,
  label,
  onBackToList,
  onClose,
  dockRef,
  height,
  otherRoutes = [],
  onOtherRoute,
  children,
  ...detail
}: Props) {
  const { livery, routeOrigin, routeDirection } = detail;
  const name = label ?? `${routeOrigin} → ${routeDirection}`;
  return (
    <BottomSheet
      ref={dockRef}
      height={height}
      label={name}
      testId="card"
      onClose={onClose}
      header={null}
      footer={
        <RouteListController
          owner="card"
          way={way}
          wayTo={wayTo}
          isSwitchable={switchable}
          isBack={back}
          onSwitch={onSwitch}
          livery={livery}
          onBack={onBackToList}
          onClose={onClose}
        />
      }
    >
      {/* The trip's name as its heading, over the cards' own, for a screen reader; nothing is drawn. */}
      <h2 className="sr-only">{name}</h2>
      <TripMoreRoutes
        ends={
          <TripEndsCard
            routeOrigin={routeOrigin}
            routeDirection={routeDirection}
            way={wayTo}
            isSwitchable={switchable}
            onSwitch={onSwitch}
          />
        }
        routes={onOtherRoute ? otherRoutes : []}
        onRoute={(id) => onOtherRoute?.(id)}
      >
        <TripDetail {...detail} />
      </TripMoreRoutes>
      {children}
    </BottomSheet>
  );
}
