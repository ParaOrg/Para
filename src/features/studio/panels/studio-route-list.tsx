import { useRef, type ComponentProps } from 'react';

import { RouteListCards } from '@/features/routes/cards/route-list-cards';
import { routeListShown } from '@/features/routes/cards/route-list-shown';
import type { Listing } from '@/features/routes/model/departures';
import type { Hotspot } from '@/features/routes/model/hotspots';
import type { Livery } from '@/features/routes/model/liveries';
import type { ModeFilterControl } from '@/features/routes/model/mode-filter';
import type { Direction } from '@/features/routes/model/routes';
import { useDialogFocus } from '@/shared/hooks/use-dialog-focus';
import { useEscape } from '@/shared/hooks/use-escape';

import { isPanelReachable } from './is-panel-reachable';

interface StudioRouteListProps {
  /** Every direction of every route under the tap, slots included, as the hooks hand them over. */
  routes: readonly Direction[];
  /** The hotspots under the tap, listed first. */
  hotspots: readonly Hotspot[];
  /** Whether the way back is showing rather than the way there (Vice Versa, on the map). */
  back: boolean;
  listing: Listing;
  /** The filter on the map, kept by the caller, who lights the map to match. */
  modeFilter: ModeFilterControl;
  /** The Selected card and what picks or lets one go (RouteCardStack). */
  selection: NonNullable<ComponentProps<typeof RouteListCards>['selection']>;
  /** Called with the direction a row opens, and the colour its card wore. */
  onRoute: (v: Direction, livery: Livery) => void;
  /** A hotspot's row: open its card. */
  onHotspot: (s: Hotspot) => void;
  /** Escape: the list closes, as the phone's ✕ closes it. */
  onClose: () => void;
  /** Kept but not shown while a trip picked from it is open: Escape there comes back to it as it was left. */
  isHidden: boolean;
}

/**
 * The route list in the studio's left panel on a computer (Figma 4905:21658): the public map's
 * RouteCards (RouteListCards), edge to edge, the panel's full height, scrolling on their own, with
 * no bar over them. Vice Versa, the filter and the Overview stand on the map beside it
 * (PlaygroundListControls); phones keep the sheet with its Controller (RouteCardList). Escape
 * closes it, unless the panel is out of reach (isPanelReachable).
 */
export function StudioRouteList({
  routes,
  hotspots,
  back,
  listing,
  modeFilter,
  selection,
  onRoute,
  onHotspot,
  onClose,
  isHidden,
}: StudioRouteListProps) {
  const ref = useRef<HTMLElement>(null);
  const shown = routeListShown(routes, hotspots, back, listing, modeFilter.picks);
  // Focused as it opens or comes back from the detail, as the phone's sheet is, so the keyboard
  // starts in the list; the focus goes back where it was as it closes.
  useDialogFocus(ref, isHidden);
  useEscape(() => {
    if (isPanelReachable(ref.current)) onClose();
  }, !isHidden);

  return (
    <section
      ref={ref}
      data-testid="chooser"
      aria-label={shown.label}
      hidden={isHidden}
      tabIndex={-1}
      className="flex h-full w-96 shrink-0 flex-col overflow-y-auto overscroll-contain bg-surface shadow-bottom-sheet-top-shadow outline-none"
    >
      <RouteListCards
        shown={shown}
        hotspots={hotspots}
        back={back}
        listing={listing}
        modeFilter={modeFilter}
        selection={selection}
        onRoute={onRoute}
        onHotspot={onHotspot}
      />
    </section>
  );
}
