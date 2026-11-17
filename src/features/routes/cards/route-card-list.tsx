import type { ReactNode } from 'react';

import { BottomSheet, type SheetHeight } from '@/shared/ui/bottom-sheet';
import type { SheetShape } from '@/shared/ui/sheet-gesture';

import { ModeFilterEmpty } from './mode-filter-empty';
import { RouteCardStack, type PickedPlace } from './route-card-stack';
import { RouteListController } from './route-list-controller';
import { RouteListHotspotRows } from './route-list-hotspot-rows';
import {
  listedDepartures,
  otherWayHasRoutes,
  routeCards,
  switchWord,
  wayWord,
  type Listing,
} from '../model/departures';
import type { Hotspot } from '../model/hotspots';
import type { Livery } from '../model/liveries';
import { passesModeFilter, type ModeFilterControl } from '../model/mode-filter';
import { hotspotCount } from '../model/places';
import { isLoop, type Direction } from '../model/routes';

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
  /** PAPUNTA: show them all the other way round. */
  onFlip: () => void;
  /** The place whose card is Selected, by name; null when none is. */
  selected: string | null;
  /** A card was picked — the map lights its directions alone — or let go (null): everything listed lit again. */
  onSelect: (place: PickedPlace | null) => void;
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
   * The filter, kept by the caller so the map lights what the cards show (passesModeFilter); the
   * cards follow it. Without one, every route is listed and the Controller has no sliders.
   */
  modeFilter?: ModeFilterControl;
  /** Drawn after the last route card, handed its livery: the public map's contribute card. */
  end?: (livery: Livery) => ReactNode;
}

/**
 * The route list's own Low, its first card's mode and name clear above the Controller (16 + 28 +
 * 8 + 32 over 78, with room to spare), and Max, the whole screen (Figma 4633:25575).
 */
const LIST_SHAPE: SheetShape = { lowPx: 240, isMaxFull: true };

/**
 * Everything under a tap that hit more than one thing (Figma 4633:25516 on a phone, 4633:22034 on
 * a wide screen): a RouteCard per place and mode the routes leave from (RouteCardStack), edge to
 * edge, and the Controller (RouteListController): ✕, PAPUNTA and the filter. On a phone the
 * Controller stands at the sheet's foot and the cards scroll under it; the sheet draws no handle
 * (one stays for the keyboard), its Low shows the first card above the Controller and its Max fills
 * the screen. On a wide screen the list docks the map's whole height on the left, 384 wide, under
 * the Controller as its top bar, in Card/Jeep.
 *
 * The grouping is departures': one way round at a time, and PAPUNTA flips them all. The map lights
 * every direction listed, the way round it is showing them; a tap on a card off its rows narrows
 * that to the card's, and a second tap, PAPUNTA, a map tap or closing let it go. A row opens its trip
 * straight away and picks no card, and the trip's ‹ comes back to every card at rest.
 *
 * Only drawn directions are listed: a row that opens nothing is no row. Under a tap every line
 * under the finger is: a route with nothing drawn the way round showing is listed by its drawn
 * direction, under the place that leaves from (chooserDepartures). PAPUNTA rests disabled when the
 * other way round has nothing drawn, and is not there when only loops show.
 *
 * The filter (ModeFilterCard), where the caller keeps one, narrows the cards to one kind of ride,
 * the caller the map's lights to match; one with nothing to show says so, with a way back to All
 * (ModeFilterEmpty).
 *
 * The hotspots under the tap come first: a box is small and deliberate. They are plain rows, a
 * row a box (TODO: the rows await the owner's hintuan design). The list's name for a screen
 * reader is its count of cards, "1 Route" for Tala with its two ways out; only with no route to
 * count does it count the hotspots, "2 Hotspots", as a rider counts them (hotspotCount): both
 * boxes of one hintuan, either side of the road, are "1 Hotspot".
 */
export function RouteCardList({
  routes,
  hotspots = [],
  back,
  listing,
  onFlip,
  selected,
  onSelect,
  onRoute,
  onHotspot,
  onClose,
  hidden,
  height,
  modeFilter,
  end,
}: Props) {
  const filter = modeFilter?.filter ?? 'all';
  const filtered = routes.filter((v) => passesModeFilter(v, filter));
  const places = listedDepartures(filtered, back, listing);
  const switchable = otherWayHasRoutes(filtered, back);
  const shownDirections = places.flatMap((p) => p.directions.map((d) => d.v));
  const hotspotTotal = hotspotCount(hotspots);
  // A RouteCard each, as RouteCardStack lays them out: a place and mode, so a place that jeeps
  // and a train both leave from counts twice.
  const cardTotal = routeCards(filtered, back, listing).length;
  const count =
    cardTotal === 0 && hotspotTotal > 0
      ? `${hotspotTotal} ${hotspotTotal === 1 ? 'Hotspot' : 'Hotspots'}`
      : `${cardTotal} ${cardTotal === 1 ? 'Route' : 'Routes'}`;

  return (
    <BottomSheet
      label={count}
      testId="chooser"
      onClose={onClose}
      hidden={hidden}
      height={height}
      floats="dock"
      shape={LIST_SHAPE}
      handle="hidden"
      header={null}
      footer={
        <RouteListController
          owner="chooser"
          // Only loops showing: they have no way back, so no PAPUNTA.
          way={
            shownDirections.length > 0 && shownDirections.every(isLoop)
              ? null
              : wayWord(back, shownDirections)
          }
          wayTo={switchWord(back, shownDirections)}
          isSwitchable={switchable}
          isBack={back}
          onSwitch={onFlip}
          modeFilter={modeFilter}
          onClose={onClose}
        />
      }
    >
      {/* At least the sheet's height, so what `end` draws can grow into the room a short list
          leaves; padded by the Controller's height, at the foot on a phone and the top where the
          list docks, so no card hides under it. */}
      <div className="flex min-h-full flex-col pb-20 sheet-floating:pt-16 sheet-floating:pb-0">
        {/* The list's heading, for a screen reader to move to; nothing is drawn. */}
        <h2 className="sr-only">Routes here</h2>
        <RouteListHotspotRows hotspots={hotspots} onHotspot={onHotspot} />
        {modeFilter && filter !== 'all' && places.length === 0 && (
          <ModeFilterEmpty filter={filter} onShowAll={() => modeFilter.onFilter('all')} />
        )}
        <RouteCardStack
          routes={filtered}
          back={back}
          listing={listing}
          selected={selected}
          onSelect={onSelect}
          onRoute={onRoute}
          testId="chooser"
          end={end}
        />
      </div>
    </BottomSheet>
  );
}
