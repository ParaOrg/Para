import type { ReactNode, Ref } from 'react';

import { BottomSheet, type SheetHeight } from '@/shared/ui/bottom-sheet';

import { RouteListController } from './route-list-controller';
import { TripDetail, type TripDetailProps } from './trip-detail';
import { TripEndsCard } from './trip-ends-card';
import { TripMoreRoutes, type OtherRoute } from './trip-more-routes';

type Props = TripDetailProps & {
  onSwitch: () => void; // ⇅ on the ends card, and PAPUNTA: the same route the other way, unless not `switchable`.
  switchable: boolean;
  back: boolean; // The way back, for the suites (PAPUNTA's `data-back`).
  /** PAPUNTA's word (wayWord), the way showing, and where its tap leads (switchWord), which it says after its name. Null on a loop. */
  way: string | null;
  wayTo: string | null;
  /** The route's via, under End's place (TripEndsCard); absent with none. */
  via?: string;
  /** The sheet's name for a screen reader, where `origin → destination` does not say it (a loop's). */
  label?: string;
  /** A loop's name, for its ends card (TripEndsCard); absent on any other trip. */
  loopName?: string;
  /** The Controller's ‹: back to what the trip was picked from — the list, a hotspot's card — or to its route with those sharing an end; null when there is none, and ✕ stands there. */
  onBackToList?: (() => void) | null;
  /** The Controller's ✕, and Escape and a pull down from Low, as for any sheet. */
  onClose: () => void;
  /**
   * Whether the Controller bar stands on the sheet: the studio's. The public map has none (Figma
   * 4831:51289): the ends card's ⇅ turns the trip, and the map tapped takes it away.
   */
  hasController?: boolean;
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
 * One direction as a trip (RouteDetail, 4796:30411) on its sheet, the studio's with the Controller
 * bar: its ends (TripEndsCard), "View N more destinations" under them (TripMoreRoutes) when other
 * routes leave from where it starts, then its body (TripDetail): what it rides, its tiles, its stops.
 */
export function TimelineRouteDetailCard({
  onSwitch,
  switchable,
  back,
  way,
  wayTo,
  via,
  label,
  loopName,
  onBackToList = null,
  onClose,
  hasController = false,
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
      // Docked the map's whole height on the left on a wide screen, as the list is (Figma 4796:33161).
      floats="dock"
      // Figma draws no notch on the trip's sheet; kept as its one drag cue, the owner to confirm.
      handle="shown"
      header={null}
      footer={
        hasController && (
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
        )
      }
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
