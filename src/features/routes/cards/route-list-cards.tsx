import type { ComponentProps, ReactNode } from 'react';

import { ModeFilterEmpty } from './mode-filter-empty';
import { RouteCardStack } from './route-card-stack';
import { RouteListHotspotRows } from './route-list-hotspot-rows';
import type { RouteListShown } from './route-list-shown';
import type { Listing } from '../model/departures';
import type { Hotspot } from '../model/hotspots';
import type { Livery } from '../model/liveries';
import type { ModeFilterControl } from '../model/mode-filter';
import type { Direction } from '../model/routes';

interface RouteListCardsProps {
  /** What the list shows under the picks (routeListShown). */
  shown: RouteListShown;
  /** The hotspots under the tap, listed first. */
  hotspots: readonly Hotspot[];
  back: boolean;
  listing: Listing;
  /** The filter, for ModeFilterEmpty's way back to All. */
  modeFilter?: ModeFilterControl;
  /** The Selected card and what picks or lets one go: the studio's alone (RouteCardStack). */
  selection?: ComponentProps<typeof RouteCardStack>['selection'];
  /** Called with the direction a row opens, and the colour its card wore: its trip wears the same. */
  onRoute: (v: Direction, livery: Livery) => void;
  /** A hotspot's row: open its card. */
  onHotspot: (s: Hotspot) => void;
  /** After the last card: the public map's DonationCard (4885:42554). */
  end?: ReactNode;
}

/**
 * A route list's contents, wherever it stands (RouteCardList's sheet, the studio's left panel):
 * its heading for a screen reader, the hotspots' rows, the filter's empty state, the RouteCards
 * edge to edge, and what follows the last card.
 */
export function RouteListCards({
  shown,
  hotspots,
  back,
  listing,
  modeFilter,
  selection,
  onRoute,
  onHotspot,
  end,
}: RouteListCardsProps) {
  return (
    <>
      {/* The list's heading, for a screen reader to move to; nothing is drawn. */}
      <h2 className="sr-only">Routes here</h2>
      <RouteListHotspotRows hotspots={hotspots} onHotspot={onHotspot} />
      {modeFilter && shown.isEmptyUnderPicks && (
        <ModeFilterEmpty picks={modeFilter.picks} onShowAll={() => modeFilter.onPicks([])} />
      )}
      <RouteCardStack
        routes={shown.routes}
        back={back}
        listing={listing}
        selection={selection}
        onRoute={onRoute}
        testId="chooser"
      />
      {end}
    </>
  );
}
