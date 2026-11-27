import type { ComponentProps, ReactNode } from 'react';

import { BottomSheet, type SheetHeight } from '@/shared/ui/bottom-sheet';

import type { RouteCardStack } from './route-card-stack';
import { RouteListCards } from './route-list-cards';
import { routeListShown } from './route-list-shown';
import { ROUTE_SHEET_SHAPE } from './route-sheet-shape';
import type { Listing } from '../model/departures';
import type { Hotspot } from '../model/hotspots';
import type { Livery } from '../model/liveries';
import type { ModeFilterControl } from '../model/mode-filter';
import type { Direction } from '../model/routes';

interface Props {
  /** Every direction of every route under the tap, slots included, as the hooks hand them over. */
  routes: readonly Direction[];
  /** The hotspots under the tap, listed first. */
  hotspots?: readonly Hotspot[];
  /** Whether the way back is showing rather than the way there. */
  back: boolean;
  /**
   * Under a tap, `every-line`: a route with nothing drawn the way round
   * showing is listed by its drawn direction (chooserDepartures). Behind a
   * trip opened on its own, `way-round`: the routes sharing its end its way.
   */
  listing: Listing;
  /** The Selected card and what picks or lets one go, where a page selects cards (RouteCardStack). */
  selection?: ComponentProps<typeof RouteCardStack>['selection'];
  /** Called with the direction a row opens, and the colour its card wore: its trip wears the same. */
  onRoute: (v: Direction, livery: Livery) => void;
  /** A hotspot's row: open its card. */
  onHotspot: (s: Hotspot) => void;
  onClose: () => void;
  /** Kept but not shown, while a trip picked from it is on top: ‹ comes back to it as it was left, every card at rest. */
  hidden?: boolean;
  /** Its height, shared with the trip opened from it (BottomSheet). */
  height?: SheetHeight;
  /**
   * The filter, kept by the caller so the map lights what the cards show (passesModePicks); the
   * cards follow it. Without one, every route is listed.
   */
  modeFilter?: ModeFilterControl;
  /** After the last card: the public map's DonationCard (4885:42554). */
  end?: ReactNode;
}

/**
 * Everything under a tap that hit more than one thing (Figma 4633:25516 on a phone, 4633:22034 on
 * a wide screen): a RouteCard per place and mode the routes leave from (RouteCardStack), edge to
 * edge. The sheet draws no handle (one stays for the keyboard), its Low shows the first card and
 * its Max fills the screen; on a wide screen it docks the map's whole height on the left, 384
 * wide. It has no bar of its own (Figma 4796:34329): Vice Versa and the sliders float on the map
 * (MapSheetControls), and an empty map tapped, Back or Escape closes it.
 *
 * The grouping is departures': one way round at a time, and Vice Versa flips them all. The map
 * lights every direction listed, the way round it is showing them. A tap on a card off its rows
 * opens its first row's trip; with `selection`, it selects the card instead, narrowing the lights
 * to the card's, and a second tap, Vice Versa, a map tap or closing let it go. A row opens its
 * trip straight away and picks no card, and going back from the trip finds every card at rest.
 *
 * Only drawn directions are listed: a row that opens nothing is no row. Under a tap every line
 * under the finger is: a route with nothing drawn the way round showing is listed by its drawn
 * direction, under the place that leaves from (chooserDepartures).
 *
 * The filter (ModeFilterMenu), where the caller keeps one, narrows the cards to the kinds of ride
 * picked, the caller the map's lights to match; one with nothing to show says so, with a way back to All
 * (ModeFilterEmpty).
 *
 * The hotspots under the tap come first: a box is small and deliberate. They are plain rows, a
 * row a box (TODO: the rows await the owner's hintuan design). The list's name for a screen
 * reader is its count of cards (routeListShown).
 */
export function RouteCardList({
  routes,
  hotspots = [],
  back,
  listing,
  selection,
  onRoute,
  onHotspot,
  onClose,
  hidden,
  height,
  modeFilter,
  end,
}: Props) {
  const picks = modeFilter?.picks ?? [];
  const shown = routeListShown(routes, hotspots, back, listing, picks);

  return (
    <BottomSheet
      label={shown.label}
      testId="chooser"
      onClose={onClose}
      hidden={hidden}
      height={height}
      floats="dock"
      shape={ROUTE_SHEET_SHAPE}
      // At most as tall as its cards: a short list rises no higher than its last card, and only a
      // list taller than the screen scrolls (the owner, 2026-11-23).
      fits
      handle="hidden"
      header={null}
    >
      {/* The list ends at its last card, the sheet's own surface below it (the owner, 2026-11-22). */}
      <div className="flex flex-col">
        <RouteListCards
          shown={shown}
          hotspots={hotspots}
          back={back}
          listing={listing}
          modeFilter={modeFilter}
          selection={selection}
          onRoute={onRoute}
          onHotspot={onHotspot}
          end={end}
        />
      </div>
    </BottomSheet>
  );
}
